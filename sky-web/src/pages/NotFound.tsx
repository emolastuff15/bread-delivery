import { Button, Result } from 'antd'
import { useNavigate } from 'react-router-dom'
import { tr } from '@/i18n'

/**
 * 404 页面（移植自原版 views/404.vue）
 */
export default function NotFound() {
  const navigate = useNavigate()

  return (
    <Result
      status="404"
      title="404"
      subTitle={tr('抱歉，您访问的页面不存在。')}
      extra={
        <Button type="primary" onClick={() => navigate('/')}>
          {tr('返回首页')}
        </Button>
      }
      style={{ paddingTop: 80 }}
    />
  )
}
