<p align="center">
  <img src="public/icon.svg" width="128" height="128" alt="Fighting Club 图标" />
</p>

<h1 align="center">Fighting Club</h1>

<p align="center">
  燕山大学教务系统第三方 Android 客户端
</p>

---

> **The first rule of Fight Club is: you do not talk about Fight Club.**
>
> **搏击俱乐部的第一条规则是：不要谈论搏击俱乐部。**

---

## 这是什么

Fighting Club 是 fork 自 [燕大终端](https://github.com/Youwenqwq/ysu-client) 的修改版本——一个燕山大学教务系统第三方 Android 客户端。

**关于本应用的具体功能、设计初衷、使用方式等，请参见原项目：[Youwenqwq/ysu-client](https://github.com/Youwenqwq/ysu-client)。**

本项目为 **第三方客户端，与燕山大学官方无任何关联。** 仅供个人学习交流，代码**完全由 AI 进行编写**，
人工仅进行了基本设计调试与粗略审计，使用即默认了解并接受相关风险，请勿用于侵犯他人权益或违反学校规定的场景。

应用通过 Capacitor 打包为 Android WebView 壳应用，支持 OTA 热更新与 APK 外壳版本检测。

## 本 Fork 的改动说明

本项目 fork 自 [Youwenqwq/ysu-client](https://github.com/Youwenqwq/ysu-client)，基于原项目 GPL-3.0 协议进行修改。

**为避免神秘大手管控，本 Fork 已删除 / 禁用以下与原作者服务器相关的功能：**

- **OTA 更新源**：默认指向本 Fork 的 GitHub Releases，不再请求原作者域名 `ysu.welain.com`
- **匿名使用统计**：已禁用，启动时不再上报任何数据
- **用户反馈接口**：已禁用，反馈功能不可用
- **公告拉取**：已禁用，不再请求原作者服务器的公告 JSON
- **官网链接**：应用内 "关于" 页面与 `APP_REPO` / `APP_WEBSITE` 常量已改为指向本 Fork

> 所有教务业务逻辑保持不变——登录、查成绩、查课表等核心功能仍由 App 直连学校教务系统实现，不经过任何第三方服务器。

## 数据来源与安全性

本应用所有业务逻辑**均在本地实现**，从官方教务系统获取数据并保存在本地，中间不经过任何其他服务器。
登录之后的凭据数据存储在本地，凭据通过系统安全存储（Android Keystore / iOS Keychain）加密保存。

为保证教务系统数据不受意外修改，本项目除学生评教外，均仅实现了数据查询功能。

## 安装

从 [GitHub Releases](https://github.com/Thatht137/ysu-client/releases) 下载最新的 APK 安装包。

> 如遇网络故障，可在应用内配置 GitHub 代理镜像。设置入口会在出现网络故障时弹出。

## 兼容性

应用运行在系统 WebView 中。如遇渲染异常，请检查 WebView 版本是否过低——
**最低要求 Chromium v111**。可通过 Play Store 等方式更新 Android System WebView。

## 致谢与协议

本项目 fork 自 [Youwenqwq/ysu-client](https://github.com/Youwenqwq/ysu-client)，感谢原作者的开源贡献。
业务逻辑参考以下项目实现：

- [ysu-sdk](https://github.com/Youwenqwq/ysu-sdk) — 教务系统 SDK
- [ysu-api](https://github.com/Youwenqwq/ysu-api) — 教务系统 API 服务

本 Fork 沿用原项目的 [GPL-3.0 协议](LICENSE) 开放源代码。依照 GPL-3.0 要求：

- 本仓库公开完整修改后的源代码
- 保留原作者署名与 LICENSE 文件
- 任何基于本仓库的再分发必须同样采用 GPL-3.0 并开源

---

<p align="center">
  <em>The second rule of Fight Club is: you DO NOT talk about Fight Club.</em><br/>
  <em>搏击俱乐部的第二条规则是：绝对不要谈论搏击俱乐部。</em>
</p>
