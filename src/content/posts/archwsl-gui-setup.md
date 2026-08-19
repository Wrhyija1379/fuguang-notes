---
title: "ArchWSL 图形化配置完整指南：在 WSL2 里跑起 KDE Plasma"
summary: "从安装 ArchWSL、初始化密钥环、装桌面环境到一键启动脚本的完整记录，含常见问题排查。"
category: tech
publishedAt: 2026-07-20
tags: ["Linux", "WSL", "Arch", "教程"]
cover: "/images/post-arch-wsl.webp"
coverAlt: "深色桌面上运行中的终端与桌面环境"
featured: false
kicker: "环境搭建"
---

在 WSL2 里装图形化 Arch Linux，核心是四件事：装好 ArchWSL、初始化密钥环、装桌面环境、写好一键启动脚本。下面是完整流程，密码示例一律用占位符代替，请自行设置强密码。

## 第一步：安装 ArchWSL

1. 去 <https://github.com/yuk7/ArchWSL/releases> 下载 `Arch.zip`
2. 解压到 `C:\Arch`（或任意目录）
3. 双击 `Arch.exe`，等待安装完成，再次双击进入 root 终端

## 第二步：初始化系统

密钥环必须最先做，否则装不了任何包：

```bash
# 1. 设置 root 密码（用强密码替换示例）
passwd

# 2. 初始化密钥环（必须最先做）
pacman-key --init
pacman-key --populate archlinux

# 3. 更新系统
pacman -Syu

# 4. 安装基础工具
pacman -S sudo nano base-devel git curl wget

# 5. 创建普通用户
useradd -m -G wheel -s /bin/bash 你的用户名
passwd 你的用户名

# 6. 配置 sudo 权限
EDITOR=nano visudo
# 找到  # %wheel ALL=(ALL:ALL) ALL  去掉前面的 #，保存退出
```

## 第三步：设置默认用户

在 Windows PowerShell（管理员）中运行：

```powershell
C:\Arch\Arch.exe config --default-user 你的用户名
```

之后重新进入就是你的用户了。

## 第四步：安装桌面环境和图形支持

```bash
# 设置镜像源（加速下载），把 China 的镜像移到最前面，如 tuna.tsinghua.edu.cn
sudo nano /etc/pacman.d/mirrorlist

# 安装图形基础
sudo pacman -S xorg-server xorg-xinit xorg-xwayland mesa

# 安装中文字体（防止乱码）
sudo pacman -S noto-fonts-cjk noto-fonts-emoji adobe-source-han-sans-cn-fonts

# ===== 推荐：KDE Plasma（约 1.5GB，好看且完整）=====
sudo pacman -S plasma-meta konsole dolphin ark gwenview spectacle

# ===== 或者轻量选择：Xfce =====
# sudo pacman -S xfce4 xfce4-goodies
```

## 第五步：安装常用软件

```bash
sudo pacman -S firefox        # 浏览器
sudo pacman -S kitty          # 终端
sudo pacman -S fcitx5 fcitx5-chinese-addons fcitx5-gtk fcitx5-qt   # 中文输入法
sudo pacman -S thunar         # 文件管理器（如果用 KDE 已有 dolphin）
```

## 第六步：每次启动桌面的流程

进入 Arch 后：

```bash
# WSLg 自动使用 :0
export DISPLAY=:0

# 如需中文输入法，先启动输入法
# fcitx5 &

# 启动 KDE Plasma
startplasma-x11

# 如果是 Xfce：
# startxfce4
```

## 第七步：一键启动脚本（可选）

```bash
nano ~/start-desktop.sh
```

写入：

```bash
#!/bin/bash
export DISPLAY=:0
export GTK_IM_MODULE=fcitx
export QT_IM_MODULE=fcitx
export XMODIFIERS=@im=fcitx
fcitx5 -d &
startplasma-x11
```

然后 `chmod +x ~/start-desktop.sh`，以后 `wsl -d Arch` 进入后执行 `~/start-desktop.sh` 即可。

## 常见问题

| 问题 | 解决 |
|------|------|
| 桌面没出现 | 确保 Windows 是 Win11 或 Win10 21H2+，且已执行 `wsl --update` |
| 中文乱码 | 安装 `noto-fonts-cjk` 后重启桌面 |
| 桌面卡顿 | `sudo pacman -S xf86-video-fbdev` |
| 想关掉桌面 | 直接关掉弹出的桌面窗口，或 Ctrl+C 终端进程 |
