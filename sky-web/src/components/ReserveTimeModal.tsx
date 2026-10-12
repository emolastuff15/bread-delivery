import { useEffect } from 'react'
import { DatePicker, Form, Modal, message } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { tr } from '@/i18n'
import {
  RESERVE_SHOW_TIME,
  isValidReserveTime,
  normalizeReserveTime,
  reserveDisabledDate,
  reserveDisabledTime,
} from '@/utils/reserveTime'

interface Props {
  open: boolean
  onCancel: () => void
  /** 确认后回调，参数为选中的时间（已保证是整点且至少晚于当前时间 1 小时） */
  onConfirm: (time: Dayjs) => void
  /** 初始值，格式 yyyy-MM-dd HH:mm:ss */
  initialValue?: string | null
  title?: string
  okText?: string
}

/**
 * 预约时间选择弹窗（顶栏"创建预约"与购物车"创建预定"共用）
 *
 * 规则：只能选**整点**（16:00、18:00），且至少比当前时间晚 **1 小时**
 */
export default function ReserveTimeModal({
  open,
  onCancel,
  onConfirm,
  initialValue,
  title = tr('创建预约'),
  okText = tr('确定'),
}: Props) {
  const [form] = Form.useForm()

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        reservationTime: initialValue ? dayjs(initialValue) : null,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialValue])

  const handleOk = () => {
    const value = form.getFieldValue('reservationTime') as Dayjs | undefined
    if (!value) {
      message.warning(tr('请选择预约时间'))
      return
    }
    if (!isValidReserveTime(value)) {
      message.warning(tr('只能选整点（如 16:00、18:00），且至少比当前时间晚 1 小时'))
      return
    }
    onConfirm(normalizeReserveTime(value))
  }

  return (
    <Modal title={title} open={open} onCancel={onCancel} onOk={handleOk} okText={okText} destroyOnClose>
      <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
        <Form.Item
          name="reservationTime"
          label={tr('预约时间')}
          rules={[{ required: true, message: tr('请选择预约时间') }]}
          extra={
            <>
              <div>{tr('预约单需要先付款；付款后进入「预约中」，系统会在预约时间前 1 小时提醒商家备餐。')}</div>
              <div>{tr('只能选整点（如 16:00、18:00），且至少比当前时间晚 1 小时')}</div>
            </>
          }
        >
          <DatePicker
            showTime={RESERVE_SHOW_TIME}
            format="YYYY-MM-DD HH:mm"
            placeholder={tr('请选择预约到店时间')}
            style={{ width: '100%' }}
            disabledDate={reserveDisabledDate}
            disabledTime={reserveDisabledTime}
            onChange={(v) => form.setFieldsValue({ reservationTime: v ? normalizeReserveTime(v) : null })}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
