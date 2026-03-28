# Flomo Waterfall

将 flomo Web 端默认的单列时间线视图，增强为更适合桌面端浏览的瀑布流布局。

这是一个运行在 `Tampermonkey` 上的油猴脚本，不修改 flomo 数据，不影响原有记录逻辑，改造为瀑布流显示模式优化了网页端的浏览效率和横向空间利用率。

## 功能特性

- 将 flomo Web 端笔记列表改造成响应式瀑布流布局
- 通过 Tampermonkey 菜单命令控制列数上限，支持通过按钮控制瀑布流列数
- 新增左侧固定栏折叠按钮，点击后可收起 / 展开侧边栏
- 兼容笔记展开收起、窗口缩放、持续加载 / 下拉加载等常见场景
- 不改动单张卡片内部元素结构，尽量复用 flomo 原生交互

## 适用范围
- 目标站点：`https://v.flomoapp.com/`
- 目标环境：桌面端 Chrome + Tampermonkey
- 当前版本：不包含“标签快速筛选栏”功能

## 安装方式

### 方式一：从 GitHub Raw 安装

1. 浏览器安装 [Tampermonkey](https://www.tampermonkey.net/)
2. 打开下面的脚本地址：

```text
https://raw.githubusercontent.com/geekest/flomo_WaterFall/main/flomo-waterfall.user.js
```

3. Tampermonkey 会自动弹出安装页
4. 点击 `Install` 完成安装

### 方式二：手动导入脚本

1. 下载仓库中的 [flomo-waterfall.user.js](./flomo-waterfall.user.js)
2. 打开 Tampermonkey 管理面板
3. 新建脚本或导入本地文件
4. 保存并启用脚本

## 使用方法

1. 安装并启用脚本后，打开 `https://v.flomoapp.com/`
2. 登录 flomo 账号
3. 进入笔记列表页后，脚本会自动接管布局
4. 左侧固定栏顶部会出现折叠按钮，可收起 / 展开侧边栏

## 交互说明

- 列数控制的是“最大展示列数”，不是强制固定列数
- 实际展示列数会同时受窗口宽度影响
- 刷新页面后，列数设置会恢复默认值 `5`
- 侧边栏默认展开，点击按钮后才会收起

## 其他说明

- 如果 flomo 官方后续调整了页面 DOM 结构，脚本可能需要同步适配
- 当前主要针对桌面端布局优化，不单独适配移动端
- 某些极端情况下，刷新后需要等待 flomo 页面完全加载后脚本才会完成第一次重排

## 项目文件

- [flomo-waterfall.user.js](./flomo-waterfall.user.js)：油猴脚本主文件
- [README.md](./README.md)：项目说明

