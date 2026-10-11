---
title: "CTFshow Web 信息收集复盘（WEB1–WEB20）"
summary: "从 HTML 注释、响应头、robots.txt 到源码备份、.git/.svn、phpinfo 与数据库文件，把二十道信息收集题的发现路径和判断依据整理成一份可复用的检查清单。"
category: tech
publishedAt: 2026-10-11
tags: ["CTF", "CTFshow", "信息收集", "Web安全"]
cover: "/images/post-ctfshow-recon.webp"
coverAlt: "桌面上的浏览器与终端，信息收集场景"
featured: false
kicker: "CTF 复盘"
---

> 本笔记用于 CTFshow 授权靶场复习。目录枚举、版本库恢复、备份文件探测等操作只能用于自己拥有或明确授权的目标。
>
> 题目实例重置后，UUID 形式的 Flag 可能变化。下面保留的是本次练习时取得的结果，复习时应重点掌握发现路径和判断依据。

## 1. 知识地图

这 20 道题并不要求复杂漏洞利用，核心是建立一个完整的信息收集习惯：浏览器展示出来的页面只是响应的一部分，源码、响应头、Cookie、DNS、静态资源、约定文件、备份文件和开发残留都可能包含线索。

| 类型 | 对应题目 | 核心知识点 |
| --- | --- | --- |
| 前端源码与注释 | WEB1、WEB2 | HTML 注释、查看源代码、客户端 JavaScript 限制 |
| HTTP 元数据 | WEB3、WEB10 | 响应头、自定义 Header、Set-Cookie、URL 编码 |
| 约定文件与隐藏入口 | WEB4、WEB12 | robots.txt 只能约束爬虫，不能实现访问控制 |
| 源码、备份与版本控制泄露 | WEB5-WEB9、WEB17、WEB20 | .phps、压缩包、.git、.svn、Vim 交换文件、SQL/MDB 数据库 |
| DNS、文档与公开信息 | WEB11、WEB13、WEB15 | DNS TXT、技术文档、默认口令、密码重置与 OSINT |
| 开发组件和静态资源 | WEB14、WEB16、WEB18、WEB19 | 在线编辑器、PHP 探针、JavaScript、Unicode、客户端加密 |

## 2. 通用信息收集方法

### 2.1 推荐检查顺序

1. 查看页面正常渲染结果，记录标题、文字、链接、表单、图片和异常提示。
2. 查看原始 HTML 源码，搜索 `flag`、`ctfshow`、`admin`、`password`、`secret`、`debug` 等关键词。
3. 打开开发者工具的 Network 面板并刷新，检查所有请求，而不只检查主文档。
4. 分别检查状态码、响应头、响应体、重定向、Cookie 和资源真实路径。
5. 查看 `robots.txt`、`sitemap.xml`、JavaScript、Source Map、接口文档和常见测试文件。
6. 根据题目提示推测备份、版本控制、编辑器残留和数据库文件名，再进行低速、定向枚举。
7. 检查 DNS 记录以及页面公开的邮箱、电话、公司名称、城市等辅助信息。
8. 下载到本地的源码、压缩包、SQL 或数据库文件要再次全文搜索，不能只看文件名。

### 2.2 浏览器与命令行的区别

- Elements 面板展示的是浏览器解析并可能被 JavaScript 修改后的 DOM。
- “查看网页源代码”展示服务器最初返回的 HTML，更适合寻找注释和原始脚本。
- Network 面板展示每一个 HTTP 请求，可看到响应头、Cookie、重定向和静态资源。
- 命令行工具不执行页面 JavaScript，因此可绕过“禁用右键、禁用 F12”一类纯前端限制。

常用命令：

```bash
# 同时查看响应头和响应体
curl -i https://target.example/

# 只请求响应头；并非所有服务器都正确支持 HEAD
curl -I https://target.example/

# 跟随 301/302 重定向
curl -iL https://target.example/

# 查看常见约定文件
curl -sS https://target.example/robots.txt
curl -sS https://target.example/sitemap.xml
```

Windows PowerShell 中建议显式使用 `curl.exe`，避免旧版 PowerShell 将 `curl` 解析为 `Invoke-WebRequest` 的别名。

### 2.3 常见泄露文件速查

| 类别 | 常见路径或后缀 |
| --- | --- |
| PHP 源码映射 | `index.phps` |
| 压缩包 | `www.zip`、`web.zip`、`backup.zip`、`site.tar.gz` |
| 临时/备份文件 | `.bak`、`.old`、`.orig`、`~`、`.swp`、`.swo`、`.swn` |
| Git | `.git/HEAD`、`.git/config`、`.git/index` |
| SVN | `.svn/entries`、`.svn/wc.db`、`.svn/pristine/` |
| 数据库备份 | `backup.sql`、`db.sql`、`dump.sql`、`db.mdb` |
| 调试/探针 | `phpinfo.php`、`info.php`、`test.php`、`tz.php` |
| 接口文档 | `swagger.json`、`openapi.json`、`api-docs`、`document` |

枚举时要比较状态码、响应长度、响应类型和页面内容。某些站点会对不存在的路径统一返回 HTTP 200，因此“200”不一定代表文件真实存在。

---

## WEB1：HTML 注释泄露

### 考点

HTML 注释不会显示在页面正文中，但会完整发送给浏览器。只要秘密进入前端响应，用户就能够读取。

### 解题过程

1. 页面上没有直接显示 Flag。
2. 使用 `Ctrl+U` 或右键“查看网页源代码”。
3. 搜索 `ctfshow` 或 `<!--`，在注释中发现：

```html
<!-- ctfshow{8efb4d75-5be2-4480-9d2a-f39049379b2b} -->
```

### 原理详解

HTML 注释的语法是 `<!-- ... -->`。浏览器在正常渲染时不显示注释内容，但注释仍属于 HTTP 响应体。隐藏显示不等于保密，CSS 的 `display:none`、隐藏表单、不可见元素同样如此。

### 风险与修复

- 不要把密码、令牌、内部地址或调试信息写入 HTML/JS/CSS 注释。
- 构建生产版本时移除调试代码和敏感注释。
- 已经发送到客户端的秘密应视为已经泄露，并及时轮换。

**Flag：** `ctfshow{8efb4d75-5be2-4480-9d2a-f39049379b2b}`

---

## WEB2：客户端限制不等于安全控制

### 考点

页面通过 JavaScript 禁止右键、文本选择或 F12，但这些限制只影响当前页面的交互，不能阻止用户取得服务器已经返回的源码。

### 关键代码

```javascript
window.oncontextmenu = function () { return false; };
window.onselectstart = function () { return false; };
window.onkeydown = function () {
  if (event.keyCode == 123) {
    event.keyCode = 0;
    event.returnValue = false;
  }
};
```

### 解题过程

可使用任意一种方式读取源码：

- `Ctrl+U`
- 在地址前添加 `view-source:`
- 先打开开发者工具，再访问页面
- 禁用 JavaScript
- 使用 `curl.exe`、Burp Suite 等直接读取 HTTP 响应

例如：

```text
view-source:https://题目地址/
```

源码注释中包含 Flag。

### 原理详解

JavaScript 运行在用户控制的浏览器中。用户可以修改脚本、跳过脚本、禁用脚本，也可以完全不使用浏览器。因此，前端代码只能改善交互，不能作为保密、鉴权或权限控制的边界。

`view-source:` 是浏览器提供的查看原始文档方式，不是服务器端安全协议。即使浏览器不支持它，也可以直接读取 HTTP 响应。

### 风险与修复

- 鉴权和权限判断必须在服务端完成。
- 不要依赖禁用右键、F12、复制或选中文本保护内容。
- 不要在前端嵌入数据库密码、私钥或可直接调用高权限接口的固定令牌。

**Flag：** `ctfshow{49255d5a-c2b0-4265-a912-348af0d62671}`

---

## WEB3：HTTP 响应头泄露

### 考点

HTTP 响应由状态行、响应头和响应体组成。敏感信息不一定出现在页面正文，也可能藏在自定义响应头中。

### 解题过程

1. 打开开发者工具的 Network 面板并刷新页面。
2. 逐个查看主文档、图片、JavaScript、`favicon.ico` 等请求。
3. 在 `favicon.ico` 请求的响应头中发现：

```http
HTTP/1.1 200 OK
Flag: ctfshow{3125d4c0-23af-45ae-b830-efb7ba3890e4}
Server: nginx/1.20.1
X-Powered-By: PHP/7.3.11
```

也可以使用：

```bash
curl -i https://题目地址/favicon.ico
```

### 原理详解

- HTTP Header 名称不区分大小写，`Flag`、`flag` 在协议层面等价。
- `Server`、`X-Powered-By` 可暴露中间件和语言版本。
- 自定义 Header 同样会发送到客户端，不能用来秘密保存 Flag。
- `Access-Control-Expose-Headers` 只决定跨域 JavaScript 能读取哪些响应头，不影响用户在开发者工具或抓包工具中查看响应。

本题还提醒我们：浏览器会自动请求 favicon 等资源，信息可能位于任何一次响应中。

### 风险与修复

- 删除调试 Header 和内部追踪信息。
- 尽量隐藏不必要的精确版本号，但不能把“隐藏版本”当成漏洞修复。
- 对响应进行统一检查，避免网关、应用和调试中间件把秘密写入 Header。

**Flag：** `ctfshow{3125d4c0-23af-45ae-b830-efb7ba3890e4}`

---

## WEB4：robots.txt 泄露隐藏路径

### 考点

`robots.txt` 是给搜索引擎爬虫看的公开规则文件，不是访问控制文件。

### 解题过程

访问：

```text
/robots.txt
```

得到：

```text
User-agent: *
Disallow: /flagishere.txt
```

随后直接访问 `/flagishere.txt` 取得 Flag。

### 原理详解

- `User-agent: *` 表示规则适用于所有遵守约定的爬虫。
- `Disallow` 表示希望爬虫不要抓取该路径。
- 文件本身是公开的，任何用户都能读取。
- 恶意客户端不会主动遵守该规则，因此它不能代替登录、鉴权、IP 限制或文件权限。

把后台路径写进 `robots.txt`，往往等于公开了一份“值得检查的路径清单”。

### 风险与修复

- 敏感路径必须实施服务端认证与授权。
- 不要在 `robots.txt` 中写入无需公开的管理路径、备份文件或密钥文件。
- 对真正不需要公开的资源，应从 Web 根目录移除。

**Flag：** `ctfshow{519fdba6-a8a8-4e2d-b1de-49f9de46ad6b}`

---

## WEB5：.phps 源码泄露

### 考点

某些 PHP/Apache 环境会把 `.phps` 映射为“显示 PHP 源码”，导致同名源码副本被公开。

### 解题过程

尝试访问：

```text
/index.phps
```

返回的源码注释中包含：

```php
// ctfshow{c49a2925-ba57-4b5b-8b95-4697a28ffc8b}
echo "web5:where is flag ?";
```

### 原理详解

`.php` 文件通常交给 PHP 解释器执行，客户端只能看到执行结果。`.phps` 并不是 PHP 的强制标准行为，而是服务器可选的 MIME/Handler 配置；某些环境会对其进行语法高亮并返回源码。

因此，`index.phps` 只是一种值得检查的源码泄露变体，不代表所有 PHP 站点都支持。

### 风险与修复

- 生产服务器不要配置不必要的 `.phps` 源码展示映射。
- 不要把源码副本、示例文件或备份文件放在 Web 根目录。
- 源码一旦泄露，应检查并轮换数据库密码、API Key、Cookie 密钥等凭据。

**Flag：** `ctfshow{c49a2925-ba57-4b5b-8b95-4697a28ffc8b}`

---

## WEB6：压缩包备份泄露

### 考点

开发者把源码压缩后留在网站目录中，Web 服务器会把压缩包当作静态文件直接提供下载。

### 解题过程

根据提示推测常见源码包：

```text
/www.zip
```

若没有明确文件名，可在授权靶场中进行低速、定向枚举：

```bash
dirsearch -u https://题目地址/ -e zip,rar,7z,tar,gz,bak -t 10
```

下载并解压 `www.zip` 后，源码提示：

```php
// flag in fl000g.txt
```

继续读取对应文件即可。

### 原理详解

PHP 源码通过 `.php` 请求时会被解释执行，但 ZIP、RAR、SQL 等文件通常由 Web 服务器直接返回。备份包可能同时包含：

- 完整业务源码
- 数据库配置和账号密码
- Git/SVN 元数据
- 历史代码和已删除功能
- 内部路径、接口和密钥

### 风险与修复

- 备份文件应放在 Web 根目录之外。
- 部署流程采用文件白名单，只发布运行所需文件。
- Web 服务器可额外拒绝访问备份后缀，但这只是纵深防御。
- 对泄露源码进行凭据排查和密钥轮换。

**Flag：** `flag{flag_here}`

---

## WEB7：Git 仓库泄露

### 考点

把项目目录连同 `.git` 部署到生产环境，会暴露当前源码、提交历史、分支信息，甚至已经从当前版本删除的秘密。

### 解题过程

首先检查：

```text
/.git/HEAD
/.git/config
/.git/index
```

本题通过目录扫描发现 `.git`，访问相关内容后取得 Flag。

在真实授权测试中，即使目录列表被关闭，单个 Git 元数据文件仍可能可访问。若核心对象完整，可使用 GitHack、git-dumper 一类工具恢复仓库，再检查：

```bash
git log --all --oneline
git show <commit>
git branch -a
git fsck --full
```

### 原理详解

Git 使用对象数据库保存 blob、tree、commit 等对象。删除工作区中的密码并提交，并不一定会立刻从历史对象中删除密码。因此，恢复仓库后必须检查全部分支、标签和历史提交，而不只是当前文件。

### 风险与修复

- 构建产物中排除 `.git`。
- Web 服务器拒绝访问点目录只能作为补充措施。
- 若仓库曾公开，必须轮换历史中出现过的所有凭据。
- 使用专门的 Secret Scanner 检查当前代码和提交历史。

**Flag：** `ctfshow{47177cf5-9277-47bc-95e5-c02cece436e1}`

---

## WEB8：SVN 元数据泄露

### 考点

SVN 工作副本中的 `.svn` 目录也可能暴露文件名、历史内容和源码副本。

### 解题过程

目录扫描发现：

```text
/.svn/
```

随后读取 SVN 元数据并取得 Flag。

常见检查点：

```text
/.svn/entries
/.svn/wc.db
/.svn/pristine/
```

### 原理详解

- 较老的 SVN 工作副本会在多个目录中保存 `.svn/entries`。
- SVN 1.7 之后主要使用根目录下的 `.svn/wc.db`，它是 SQLite 数据库。
- `wc.db` 的 `NODES` 等表可暴露项目相对路径和对象校验值。
- `.svn/pristine` 中可能保存文件的原始副本。

### 风险与修复

- 生产部署只复制构建产物，不复制整个开发工作区。
- 明确排除 `.svn`、`.git`、`.hg` 等版本控制目录。
- 泄露后检查历史源码中的密码、令牌和内部接口。

**Flag：** `ctfshow{fad93671-11c1-43a6-a2c3-c5b28507efd2}`

---

## WEB9：Vim 交换文件泄露

### 考点

Vim 编辑文件时会创建交换文件。若编辑器异常退出，交换文件可能残留在 Web 目录并被直接下载。

### 解题过程

题目提示开发者在生产环境使用 Vim 且发生异常。尝试：

```text
/index.php.swp
/.index.php.swp
/.index.php.swo
/.index.php.swn
```

本题通过 `index.php.swp` 取得了包含 Flag 的残留内容。

下载后可尝试使用 Vim 恢复：

```bash
vim -r index.php
```

也可以先使用 `strings` 搜索明显的文本线索。

### 原理详解

Vim 常见残留文件并不完全相同：

- 交换文件：通常是 `.index.php.swp`，冲突时依次使用 `.swo`、`.swn`。
- 备份文件：常见为 `index.php~`。
- 持久化撤销文件：可能是 `.index.php.un~`。

题目或服务器配置可能使用不同命名，所以应根据原文件名尝试多个合理变体。

### 风险与修复

- 不要直接在生产 Web 根目录中编辑代码。
- 部署完成后清理临时文件、交换文件和编辑器备份。
- Web 服务器可拒绝访问隐藏文件和临时后缀。
- 使用 CI/CD 发布不可变构建产物，减少人工在线修改。

**Flag：** `ctfshow{dabc17af-fdbf-45d7-8628-91a1d52ec017}`

---

## WEB10：Set-Cookie 与 URL 编码

### 考点

服务器可能通过响应头下发 Cookie。Cookie 值还可能使用百分号编码，需要解码后才能阅读。

### 解题过程

在 Network 面板的 Response Headers 中发现：

```http
Set-Cookie: flag=ctfshow%7B0142746d-e302-4cba-9f36-4753aebdd429%7D
```

其中：

- `%7B` 是 `{`
- `%7D` 是 `}`

浏览器控制台可直接解码：

```javascript
decodeURIComponent("ctfshow%7B0142746d-e302-4cba-9f36-4753aebdd429%7D")
```

### 原理详解

- `Set-Cookie`：服务器在响应中要求浏览器保存 Cookie。
- `Cookie`：浏览器在后续请求中把符合域、路径等条件的 Cookie 发回服务器。
- 百分号编码只是编码，不是加密，任何人都能还原。
- `HttpOnly` 可阻止页面 JavaScript 直接读取 Cookie，但用户仍可在浏览器存储或网络工具中看到自己的 Cookie。
- `Secure` 表示只通过 HTTPS 发送；`SameSite` 主要缓解跨站请求风险。

### 风险与修复

- 不要把 Flag、密码或其他秘密直接作为客户端 Cookie 值。
- 会话 Cookie 应使用高熵、不可预测的会话标识，并在服务端保存真实状态。
- 根据场景设置 `Secure`、`HttpOnly` 和合适的 `SameSite`。

**Flag：** `ctfshow{0142746d-e302-4cba-9f36-4753aebdd429}`

---

## WEB11：DNS TXT 记录信息泄露

### 考点

DNS 不只包含 IP 地址。TXT 记录是公开可查询的数据，常用于域名验证、邮件安全和备注信息。

### 解题过程

根据提示查询 `flag.ctfshow.com` 的 TXT 记录：

```bash
nslookup -type=TXT flag.ctfshow.com
dig TXT flag.ctfshow.com
```

PowerShell：

```powershell
Resolve-DnsName -Name flag.ctfshow.com -Type TXT
```

得到：

```text
flag{just_seesee}
```

### 原理详解

常见 DNS 记录包括：

- `A`：域名到 IPv4 地址
- `AAAA`：域名到 IPv6 地址
- `CNAME`：别名指向另一个域名
- `MX`：邮件服务器
- `TXT`：任意文本，常用于 SPF、DKIM、DMARC 和第三方服务验证

TXT 记录可能被拆成多个引号包裹的字符串，解析时需要按顺序拼接。由于 DNS 数据本来就是公开查询的，不应在其中放置真正的秘密。

### 风险与修复

- 定期清理过期的域名验证 TXT 记录。
- 不要在 DNS 中保存内部凭据、调试口令或敏感备注。
- 信息收集时同时检查根域名和有意义的子域名，如 `flag`、`dev`、`test`。

**Flag：** `flag{just_seesee}`

---

## WEB12：robots.txt、后台入口与弱口令链

### 考点

单个信息泄露可能影响有限，但多个弱点组合后会形成完整攻击链。

### 解题过程

1. 访问 `/robots.txt`，获得隐藏后台路径。
2. 访问 `/admin`。
3. 在页面公开信息中发现密码线索。
4. 使用页面末尾暴露的电话号码作为登录凭据，成功取得 Flag。

### 原理详解

本题组合了三类问题：

- `robots.txt` 暴露后台入口。
- 页面公开敏感个人信息。
- 后台使用可猜测、可从公开信息获得的弱密码。

安全性取决于整条链路中最弱的一环。隐藏 URL 不是鉴权，电话号码也不是秘密。

### 风险与修复

- 后台必须使用可靠认证和服务端授权。
- 强制高强度密码，并配合 MFA、登录限速和异常检测。
- 页面只展示业务需要的个人信息，敏感字段进行脱敏。
- 不要将手机号、生日、城市等公开信息直接作为默认密码。

**Flag：** `ctfshow{2f0df6f2-5b4d-41f9-9505-8a9974096d76}`

---

## WEB13：技术文档与默认凭据泄露

### 考点

部署到生产环境的开发文档、接口文档和运维手册可能包含后台地址、测试账号和默认密码。

### 解题过程

1. 检查页面底部链接，发现 `document`。
2. 访问技术文档。
3. 从文档中的敏感信息或默认凭据进入对应功能，取得 Flag。

### 原理详解

技术文档本身也是攻击面。常见泄露内容包括：

- 默认管理员账号和密码
- 内部域名、IP、端口
- 测试接口和未上线功能
- API 参数、鉴权方式和示例令牌
- 数据库结构和部署路径

Swagger/OpenAPI、GraphQL Playground、README、安装手册都应纳入信息收集范围。

### 风险与修复

- 生产文档必须经过脱敏和发布审核。
- 内部文档应实施独立认证和最小权限访问。
- 部署后立即修改默认凭据。
- 示例令牌和测试账号不能复用到生产环境。

**Flag：** `ctfshow{3d6efb97-5617-44a0-a035-7546992cc0de}`

---

## WEB14：在线编辑器、附件路径与物理路径泄露

### 考点

在线编辑器和文件管理组件通常带有上传、附件浏览、路径回显等功能，配置不当时会暴露文件列表或服务器物理路径。

### 解题过程

1. 访问 `/editor`，进入编辑器页面。
2. 在附件列表或相关路径中发现：

```text
/editor/attached/file/var/www/html/nothinghere/fl000g.txt
```

3. `/var/www/html` 是常见 Linux Web 根目录。
4. 将物理路径相对于 Web 根目录的部分映射为 URL：

```text
/nothinghere/fl000g.txt
```

5. 访问该路径取得 Flag。

### 原理详解

文件系统路径与 URL 路径不是同一个概念：

- 物理路径：服务器磁盘上的 `/var/www/html/nothinghere/fl000g.txt`
- URL 路径：客户端访问的 `/nothinghere/fl000g.txt`

若 Web 根目录正好映射到 `/var/www/html`，去掉物理路径前缀后就能推导出公开 URL。本题主要体现编辑器组件的信息泄露和路径映射，不必在没有证据时直接判定为任意文件读取。

### 风险与修复

- 删除生产环境不需要的在线编辑器和示例页面。
- 禁止附件目录列表，避免响应中回显绝对物理路径。
- 上传文件存放在 Web 根目录之外，并通过受控下载接口访问。
- 对文件路径进行规范化和权限校验，防止目录穿越。

**Flag：** `ctfshow{adff5363-4fa1-4eec-b199-e24a1b98557b}`

---

## WEB15：密码重置与公开信息推断

### 考点

使用城市、生日、手机号等“安全问题”验证身份非常脆弱，因为答案常能通过页面、社交资料或其他公开信息推断。

### 解题过程

1. 根据提示访问 `/admin`。
2. 进入密码重置流程。
3. 观察页面末尾公开的邮箱等身份线索。
4. 根据线索得到重置问题要求的城市，完成验证并取得 Flag。

### 原理详解

这类方式称为知识型认证或 KBA（Knowledge-Based Authentication）。它的问题在于：

- 答案熵很低，可选范围有限。
- 很多答案并不私密。
- 同一个答案可能长期不变。
- 攻击者可结合邮箱、昵称、公司和社交资料进行 OSINT。

安全问题不能提供与随机重置令牌相同的安全性。

### 风险与修复

- 使用高熵、短时有效、一次性的密码重置令牌。
- 重置链接发送到已验证的邮箱或可信设备。
- 重置成功后使旧会话失效，并通知账号所有者。
- 对重置尝试限速，不把“城市”等公开信息作为唯一身份凭据。

**Flag：** `ctfshow{52317156-5a06-4863-8570-deeaaf634c0b}`

---

## WEB16：PHP 探针与 phpinfo 泄露

### 考点

测试探针用于快速查看服务器环境，若部署后未删除，会向任何访问者公开大量运行信息。

### 解题过程

访问常见探针路径：

```text
/tz.php
```

页面中可看到类似 phpinfo 的环境信息，包括：

```text
PWD          /var/www/html
PHP_SHA256   657cf6464bac28e9490c59c07a2cf7bb76c200f09cfadf6e44ea64e95fa01021
FLAG         ctfshow{808169b7-debb-463b-8614-378241921cc4}
USER         www-data
```

### 原理详解

`phpinfo()` 或第三方 PHP 探针通常会展示：

- PHP 与 Web 服务器版本
- 已加载扩展
- `php.ini` 路径和关键配置
- 文档根目录、脚本路径和系统用户
- 环境变量、请求头和服务器变量
- 数据库、缓存、上传等组件信息

这些信息可用于精准选择后续测试方向。若环境变量中保存密钥，phpinfo 还可能直接造成凭据泄露。

### 风险与修复

- 测试完成后删除探针、`phpinfo.php` 和调试页面。
- 必须保留时，应限制到内网并实施强认证。
- 不要在公开错误页或调试页输出环境变量和配置文件内容。
- 对已泄露的密钥执行轮换。

**Flag：** `ctfshow{808169b7-debb-463b-8614-378241921cc4}`

---

## WEB17：SQL 备份文件泄露

### 考点

数据库导出文件通常是明文 SQL，既包含表结构，也可能包含完整业务数据、账号哈希和秘密。

### 解题过程

访问：

```text
/backup.sql
```

在 SQL 中搜索 `flag`、`secret` 等关键词：

```sql
CREATE TABLE `ctfshow_secret` (
  `secret` varchar(255) DEFAULT NULL
);

INSERT INTO `ctfshow_secret`
VALUES ('ctfshow{b9aca1a9-b7d4-4bad-9158-afa537643245}');
```

本地可使用：

```bash
rg -n -i "flag|secret|password|token|key" backup.sql
```

PowerShell：

```powershell
Select-String -Path .\backup.sql -Pattern 'flag|secret|password|token|key'
```

### 原理详解

SQL Dump 可能泄露：

- 表名、字段名和数据关系
- 管理员账号、密码哈希和个人信息
- API Key、Token、重置码
- 未上线功能和隐藏业务表
- 可供 SQL 注入后续利用的精确数据库结构

即使文件中没有明文密码，表结构本身也具有较高情报价值。

### 风险与修复

- 备份文件放在 Web 根目录之外，并使用严格文件权限。
- 备份传输和存储均应加密。
- 设置备份保留周期，及时删除临时导出文件。
- Web 服务器拒绝访问 `.sql` 只能作为补充，不能替代正确存储。

**Flag：** `ctfshow{b9aca1a9-b7d4-4bad-9158-afa537643245}`

---

## WEB18：JavaScript 源码、Unicode 转义与路径线索

### 考点

JavaScript 文件会完整下载到浏览器。Unicode 转义、压缩和混淆只能增加阅读成本，不能保护其中的秘密。

### 解题过程

1. 在 Network 或 Sources 面板查看页面加载的 JavaScript。
2. 在“小鸟飞停”相关脚本中发现：

```text
\u4f60\u8d62\u4e86\uff0c\u53bb\u5e7a\u5e7a\u96f6\u70b9\u76ae\u7231\u5403\u76ae\u770b\u770b
```

3. Unicode 解码得到：

```text
你赢了，去幺幺零点皮爱吃皮看看
```

4. “幺幺零”对应 `110`，“点皮爱吃皮”谐音提示 `.php`，因此访问：

```text
/110.php
```

5. 取得 Flag。

浏览器控制台可用 JSON 解析 Unicode 转义：

```javascript
JSON.parse('"\\u4f60\\u8d62\\u4e86\\uff0c\\u53bb\\u5e7a\\u5e7a\\u96f6..."')
```

### 原理详解

`\uXXXX` 是 JavaScript/JSON 常见的 Unicode 转义形式，`XXXX` 是字符的十六进制码点。它属于编码表示，不是加密。

检查 JavaScript 时应重点搜索：

- API 路径和隐藏页面
- 参数名、角色名和错误信息
- 固定 Token、Key、IV
- 注释、调试函数和测试账号
- `sourceMappingURL` 指向的 `.map` 文件

### 风险与修复

- 前端只保存公开信息和运行所需的非秘密配置。
- API 密钥和高权限令牌必须保存在服务端。
- 不要把压缩、Base64、Unicode 或混淆当作安全措施。
- 生产环境谨慎发布 Source Map，尤其是其中包含完整源码时。

**Flag：** `ctfshow{22fee896-98c0-4104-8ef4-07561dcad4f9}`

---

## WEB19：客户端 AES 加密与请求参数重放

### 考点

客户端 JavaScript 中的加密密钥、IV 和算法对用户完全可见。服务端若只比较客户端提交的固定密文，攻击者可以跳过页面逻辑，直接构造请求。

### 已知服务端判断

```php
$u = $_POST['username'];
$p = $_POST['pazzword'];

if ($u === 'admin' &&
    $p === 'a599ac85a73384ee3219fa684296eaa62667238d608efa81837030bd1ce1bf04') {
    echo $flag;
}
```

注意参数名是题目中的 `pazzword`，不是常见的 `password`。参数名拼写必须与服务端一致。

### 解题过程

直接向服务端提交其期望的值：

```bash
curl.exe -sS -X POST "https://题目地址/" -H "Content-Type: application/x-www-form-urlencoded" --data "username=admin&pazzword=a599ac85a73384ee3219fa684296eaa62667238d608efa81837030bd1ce1bf04"
```

页面 JavaScript 中还可以看到：

| 参数 | 值 |
| --- | --- |
| 算法 | AES-128 |
| 模式 | CBC |
| 填充 | ZeroPadding |
| Key | `0000000372619038`，16 字节 |
| IV | `ilove36dverymuch`，16 字节 |
| 输出 | Hex |

### 原理详解

- AES 是分组密码，AES-128 使用 16 字节密钥。
- AES 的分组大小固定为 16 字节，与密钥长度概念不同。
- CBC 模式会把前一密文分组参与下一分组计算，并需要 16 字节 IV。
- ZeroPadding 用 `0x00` 补齐分组，对某些数据存在去填充歧义。
- Hex 只是把二进制密文表示为十六进制字符串。

关键问题不在 AES 是否安全，而在信任边界错误：密钥、IV、算法和待提交值都位于攻击者控制的客户端。HTTPS 已负责传输加密，额外的固定客户端加密不能替代服务端认证。

### 风险与修复

- 密码验证必须在服务端完成。
- 服务端使用 Argon2id、bcrypt 等密码哈希方案，不应保存或比较固定可重放密文。
- 不在 JavaScript 中硬编码真正需要保密的密钥。
- 服务端不能假设请求一定经过官方页面或官方 JavaScript。

**Flag：** `ctfshow{fffaff95-4b87-494c-bd25-4e3104fb11fc}`

---

## WEB20：Access/MDB 数据库文件泄露

### 考点

把数据库文件直接放在 Web 目录中，会导致任何人下载完整数据库。

### 解题过程

访问：

```text
/db/db.mdb
```

下载后可使用以下方式检查：

- Microsoft Access
- LibreOffice Base
- Linux 的 `mdbtools`
- `strings` 配合关键词搜索

```bash
strings db.mdb | rg -i "ctfshow|flag|secret|password"
```

最终得到：

```text
flag{ctfshow_old_database}
```

### 原理详解

`.mdb` 是 Microsoft Access/Jet 数据库格式。它是二进制文件，但其中仍可能包含可直接提取的表名、字段名和字符串数据。Web 服务器通常不会理解其业务含义，只会把它作为静态文件下载。

这类问题与 SQLite 的 `.db`、`.sqlite` 文件泄露本质相同：数据库文件一旦可下载，应用层登录和权限控制就被绕过。

### 风险与修复

- 数据库文件必须位于 Web 根目录之外。
- 使用专门数据库服务或受控的数据访问层。
- 对下载目录配置扩展名白名单，而不是只拦截少数危险后缀。
- 若数据库已泄露，应评估全部数据并轮换其中的密码和密钥。

**Flag：** `flag{ctfshow_old_database}`

---

## 3. 高频误区

1. **页面看不到就是不存在。**  
   错。内容可能在源码注释、隐藏元素、响应头、Cookie、JavaScript 或其他请求中。

2. **禁用 F12、右键和复制就能保护源码。**  
   错。客户端限制不构成安全边界。

3. **robots.txt 中禁止抓取的路径就是受保护路径。**  
   错。它只是一份公开的爬虫建议。

4. **Base64、URL 编码、Unicode 和十六进制是加密。**  
   错。它们都是可逆编码或表示方法。

5. **前端使用 AES 就能隐藏密码或密钥。**  
   错。浏览器必须获得算法和密钥才能运行，用户也就能获得它们。

6. **删除当前源码中的密码就解决了泄露。**  
   错。Git/SVN 历史、备份包、交换文件和数据库导出中仍可能保留旧值。

7. **目录爆破只看 HTTP 200。**  
   错。要同时比较状态码、长度、内容类型、标题和响应正文，识别自定义 404。

## 4. 信息收集检查清单
- [ ] 查看原始 HTML 源码和 HTML 注释
- [ ] 查看 Elements 与原始源码的差异
- [ ] 检查 Network 中的所有请求
- [ ] 检查响应头、自定义 Header、Cookie 和重定向
- [ ] 检查 `robots.txt`、`sitemap.xml` 和 `.well-known/`
- [ ] 检查 JavaScript、注释、接口路径和 Source Map
- [ ] 检查 `.phps`、备份包和临时文件
- [ ] 检查 `.git`、`.svn` 等版本控制元数据
- [ ] 检查 PHP 探针、调试页面和技术文档
- [ ] 检查 SQL、MDB、SQLite 等数据库备份
- [ ] 检查 DNS TXT 等公开记录
- [ ] 检查密码重置流程是否依赖可公开推断的信息
- [ ] 下载的文件进行解压、全文搜索和历史检查
- [ ] 记录每条线索的来源、请求路径、响应证据和复现步骤

