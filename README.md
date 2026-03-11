# ZJU-Autosign

The certain script allowing you learning better in ZJU with rollcall support.

该项目源自[ZJU-live-better](https://github.com/5dbwat4/ZJU-live-better)中的脚本之一。

## 使用方式

简易：

1. 克隆本仓库；
2. 参考`.env.example`创建`.env`文件，并填写相关信息；
3. 运行`npm install`安装依赖；
4. 运行`npm run autosign`启动脚本。

你也可以参考[docker部署](#docker)部分使用docker进行部署。

## 钉钉通知

参考[文档](https://open.dingtalk.com/document/dingstart/custom-bot-creation-and-installation)配置自定义机器人，并将Webhook地址和Secret填入`.env`文件中。安全设置请选择“加签”。

<!-- ## 前端

实现中 -->

## docker

提供了基于 Docker 的部署方式。

1. 参考`.env.example`创建`.env`文件，并填写相关信息；
2. 构建并启动容器：

```bash
docker compose up -d --build
```

3. 查看日志：

```bash
docker compose logs -f autosign
```

## 免责声明

本项目仅供学习交流使用，请勿用于任何商业用途，请勿用于任何非法或违规用途。使用本项目前请务必了解并遵守浙江大学相关政策和规定。作者不对因使用本项目而导致的任何后果负责。
