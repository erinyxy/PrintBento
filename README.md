# PrintBento

按真实纸张尺寸排版照片并导出 PDF 的静态工具。支持 A4、L 判、2L、明信片、证件照网格和定位文字。无需安装依赖或构建。

在线使用：<https://printbento.vercel.app/>

## 本地预览

在项目目录运行 `python3 -m http.server 4173`，然后打开 `http://127.0.0.1:4173/`。

## Vercel

Vercel 项目 `printbento` 已连接 `erinyxy/PrintBento`。Framework Preset 为 `Other`，Root Directory 是仓库根目录，Build Command 留空。后续推送到 `main` 会自动触发部署。

照片在浏览器内读取、排版和导出，不会作为文件上传到项目服务器。定位需要浏览器授权；地址文字可手动修改。当前编辑内容只保存在页面内，刷新后会清空。
