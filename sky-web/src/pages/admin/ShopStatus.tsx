import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Result, Space, Switch, message } from 'antd'
import { getAdminShopStatus, setAdminShopStatus } from '@/api/admin'
import { tr } from '@/i18n'

export default function ShopStatus() {
  const [open, setOpen] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(() => {
    getAdminShopStatus()
      .then((s) => setOpen(s === 1))
      .catch(() => setOpen(null))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const onChange = async (checked: boolean) => {
    setLoading(true)
    try {
      await setAdminShopStatus(checked ? 1 : 0)
      setOpen(checked)
      message.success(checked ? tr('店铺已开始营业') : tr('店铺已打烊'))
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card title={tr('店铺营业状态')}>
      <Result
        status={open ? 'success' : 'warning'}
        title={open === null ? tr('获取状态失败，请检查 Redis 是否可用') : open ? tr('店铺营业中') : tr('店铺已打烊')}
        subTitle={
          <Space size="middle">
            <span>{tr('营业状态开关（同步到用户端首页）')}</span>
            <Switch
              checked={open === true}
              loading={loading}
              disabled={open === null}
              onChange={onChange}
              checkedChildren={tr('营业中')}
              unCheckedChildren={tr('打烊')}
            />
          </Space>
        }
      />
      <div style={{ textAlign: 'center' }}>
        <Button onClick={load}>{tr('刷新状态')}</Button>
      </div>
    </Card>
  )
}
