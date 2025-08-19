# electron-apps
第一步：在main.js中找到TARGET_URL，改为你要打包的的网页
<img width="814" height="105" alt="image" src="https://github.com/user-attachments/assets/d417f03d-284b-43ad-8ca3-418e4579ab36" />
第二步：在package.json中找到productName和icon，分别改为你要应用名字和图标，图标格式会因系统原因所要求的格式不同，productName和icon名字最好都一样
<img width="784" height="172" alt="image" src="https://github.com/user-attachments/assets/f03ae603-2a11-4070-8038-86b5116d4791" />
第三步：可以根据自己的系统，设置目标类型，这里Win是指Windows系统下直接打包为一个包含应用的目录，根据喜好任选其一即可太多打包耗时越多
<img width="292" height="373" alt="image" src="https://github.com/user-attachments/assets/060d3648-6cd6-4fd2-96fb-697d9b6389c4" />

Windows (win):
dir:一个目录

nsis:  Nullsoft Scriptable Install System，一个非常流行的 Windows 安装程序生成器。  它创建完整的安装程序，提供用户友好的安装体验，包括安装路径选择、快捷方式创建等功能。  这是推荐的 Windows 打包方式。

msi:  Windows Installer，微软的安装程序格式。  它是一种标准的 Windows 安装程序格式，提供了许多功能，例如注册表编辑、文件关联等。

squirrel:  Squirrel.Windows，一个用于创建 Windows 安装程序的工具。  它可以创建自动更新功能的安装程序。

zip:  简单的 zip 压缩包，包含应用程序的所有文件。  用户需要手动解压缩并运行应用程序。  这通常用于测试或分发给熟悉命令行的用户。

7z:  使用 7-Zip 压缩算法的压缩包。  类似于 zip，但压缩率通常更高。

macOS (mac):

dmg:  磁盘镜像文件，这是 macOS 上最常用的安装包类型。  它是一个用户友好的安装包，用户双击可以挂载，然后将应用程序拖放到 Applications 文件夹中。  强烈推荐。

zip:  简单的 zip 压缩包，包含应用程序的所有文件。

Linux (linux):

deb:  Debian 和 Ubuntu 等基于 Debian 的发行版使用的软件包格式。

rpm:  Red Hat、Fedora 和 CentOS 等基于 RPM 的发行版使用的软件包格式。

snap:  一个通用的 Linux 包格式，可以跨不同的发行版运行。  需要额外的配置才能使用 Snap 打包。

tar.gz 或 tar.xz:  标准的 Linux 归档格式。  它们是简单的压缩包，需要用户手动解压缩和运行。

zip:  简单的 zip 压缩包。

第五步：开始测试，并打包为桌面应用
控制台输入：npm run start 并回车确认
<img width="1011" height="262" alt="image" src="https://github.com/user-attachments/assets/483769a4-31ce-402c-b916-ca53d6d9e793" />
没问题后关闭应用
控制台输入：npm run build 并回车确认，几秒钟打包完成，打包好的应用在你项目的跟目录下
<img width="1036" height="262" alt="image" src="https://github.com/user-attachments/assets/26f1b9ce-db68-4139-9833-ffe23ba4023a" />




