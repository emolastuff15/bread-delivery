import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import enUS from 'antd/locale/en_US'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import App from './App'
import { isEn } from './i18n'
import './index.css'

// 英文版（vite --mode en）：antd 组件自带文案（分页、空数据、日期选择器、确认框按钮）也切成英文，
// 否则这些"不属于我们代码"的文字会残留中文。中文版行为不变。
if (isEn) {
  dayjs.locale('en')
}
document.documentElement.lang = isEn ? 'en' : 'zh-CN'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider locale={isEn ? enUS : zhCN}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ConfigProvider>
  </React.StrictMode>,
)
