import { useNavigate } from 'react-router-dom'
import { Button, Card, Carousel, Col, Row, Space, Tag, Typography } from 'antd'
import {
  FireOutlined,
  ClockCircleOutlined,
  HeartOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  ShopOutlined,
} from '@ant-design/icons'
import { tr } from '@/i18n'

const { Title, Paragraph, Text } = Typography

/** 面包轮播图（外链图源；加载失败会自动降级为本地渐变占位图，不会显示破图） */
const BREAD_SLIDES = [
  {
    url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1600&q=80&auto=format&fit=crop',
    title: tr('每日现烤欧包'),
    desc: tr('天然酵母慢发酵 18 小时，外壳脆、内里湿润'),
  },
  {
    url: 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=1600&q=80&auto=format&fit=crop',
    title: tr('黄油可颂'),
    desc: tr('层层起酥，出炉时还在滋滋作响'),
  },
  {
    url: 'https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=1600&q=80&auto=format&fit=crop',
    title: tr('乡村酸种'),
    desc: tr('微酸回甘，越嚼越香的那种'),
  },
  {
    url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=1600&q=80&auto=format&fit=crop',
    title: tr('手作吐司'),
    desc: tr('撕开有拉丝，早餐的稳妥选择'),
  },
]

/** 占位图：外链加载失败时使用（内联 SVG，不依赖网络） */
const FALLBACK_IMG =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#f7c873"/>
          <stop offset="55%" stop-color="#e08b3c"/>
          <stop offset="100%" stop-color="#a34d12"/>
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#g)"/>
      <text x="800" y="470" font-size="120" text-anchor="middle" fill="#fff8ec"
            font-family="PingFang SC,Microsoft YaHei,sans-serif" font-weight="700">${tr('刚出炉')}</text>
      <text x="800" y="560" font-size="44" text-anchor="middle" fill="#fff3e0"
            font-family="PingFang SC,Microsoft YaHei,sans-serif">${tr('图片加载中 · 面包正在烤箱里')}</text>
    </svg>`,
  )

const FEATURES = [
  {
    icon: <FireOutlined />,
    title: tr('美拉德反应，就是香'),
    desc: tr('忍受不了冷硬的面包了吗？我们确信没有什么是比刚出炉、散发着黄油香气、充斥着美拉德反应的面包更好的了。'),
  },
  {
    icon: <ThunderboltOutlined />,
    title: tr('现做现送，不卖隔夜'),
    desc: tr('不囤货、不预制、不冷冻回炉。接到订单才开炉，出炉直接打包配送。'),
  },
  {
    icon: <ClockCircleOutlined />,
    title: tr('预定即锁定出炉时间'),
    desc: tr('这是我们最核心的能力：你提前预定时间，我们倒推排炉，掐着点把面包从烤箱送到你手上。'),
  },
  {
    icon: <HeartOutlined />,
    title: tr('真材实料'),
    desc: tr('动物黄油、进口高筋粉、天然酵母，零反式脂肪，配料表短到看得懂。'),
  },
  {
    icon: <SafetyCertificateOutlined />,
    title: tr('全程保温配送'),
    desc: tr('专用保温箱配送，到手仍有炉温——这是我们对"新鲜"的全部理解。'),
  },
  {
    icon: <ShopOutlined />,
    title: tr('面包师手作'),
    desc: tr('每天凌晨四点开炉，每一炉都有面包师盯着火候。'),
  },
]

const STEPS = [
  { no: '01', title: tr('挑选面包'), desc: tr('欧包、可颂、吐司、酸种，都是当日现烤') },
  { no: '02', title: tr('预约时间'), desc: tr('选一个你希望送达的时间点') },
  { no: '03', title: tr('我们现烤'), desc: tr('按你的时间倒推排炉，出炉即打包') },
  { no: '04', title: tr('准时送达'), desc: tr('保温配送，到你手上还是热的') },
]

/**
 * 门户页（登录/注册前）
 * 未登录用户访问站点时会先看到它；点「现在购买」进入登录/注册。
 */
export default function Portal() {
  const navigate = useNavigate()

  return (
    <div style={{ background: '#fffaf3', minHeight: '100vh' }}>
      {/* 顶部条 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 32px',
          background: '#3b2412',
          color: '#fff8ec',
        }}
      >
        <Space size={10}>
          <span style={{ fontSize: 20 }}>🥐</span>
          <Text style={{ color: '#fff8ec', fontSize: 18, fontWeight: 700, letterSpacing: 1 }}>
            {tr('麦香晨烤')}
          </Text>
          <Tag color="orange" style={{ marginLeft: 4 }}>
            {tr('手作面包烘焙公司')}
          </Tag>
        </Space>
        <Space>
          <Button type="text" style={{ color: '#ffe9c9' }} onClick={() => navigate('/login')}>
            {tr('登录')}
          </Button>
          <Button type="primary" onClick={() => navigate('/register')}>
            {tr('注册')}
          </Button>
        </Space>
      </div>

      {/* Hero + 轮播图 */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px 8px' }}>
        <Row gutter={[32, 24]} align="middle">
          <Col xs={24} md={10}>
            <Tag color="gold" style={{ marginBottom: 12 }}>
              {tr('每日现烤 · 现做现送')}
            </Tag>
            <Title level={1} style={{ marginTop: 0, fontSize: 42, lineHeight: 1.25 }}>
              {tr('刚出炉的面包')}
              <br />
              {tr('正在等你')}
            </Title>
            <Paragraph style={{ fontSize: 16, color: '#7a5c3e' }}>
              {tr('我们是一家只做当日现烤的手作面包烘焙公司。')}
              <br />
              <Text strong>{tr('你预定，我们现做，出炉即送。')}</Text>
            </Paragraph>
            <Button
              size="large"
              style={{
                background: '#ffd400',
                borderColor: '#ffd400',
                color: '#5a3b00',
                fontWeight: 700,
                height: 48,
                padding: '0 36px',
              }}
              onClick={() => navigate('/login')}
            >
              {tr('现在购买')}
            </Button>
          </Col>

          <Col xs={24} md={14}>
            <Carousel autoplay autoplaySpeed={4000} dots style={{ borderRadius: 16, overflow: 'hidden' }}>
              {BREAD_SLIDES.map((s) => (
                <div key={s.url}>
                  <div style={{ position: 'relative', height: 380, background: '#f0e0cc' }}>
                    <img
                      src={s.url}
                      alt={s.title}
                      style={{ width: '100%', height: 380, objectFit: 'cover', display: 'block' }}
                      onError={(e) => {
                        const img = e.target as HTMLImageElement
                        if (img.src !== FALLBACK_IMG) img.src = FALLBACK_IMG
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        bottom: 0,
                        padding: '40px 24px 20px',
                        background: 'linear-gradient(transparent, rgba(0,0,0,0.62))',
                        color: '#fff',
                      }}
                    >
                      <div style={{ fontSize: 22, fontWeight: 700 }}>{s.title}</div>
                      <div style={{ fontSize: 14, opacity: 0.9 }}>{s.desc}</div>
                    </div>
                  </div>
                </div>
              ))}
            </Carousel>
          </Col>
        </Row>
      </div>

      {/* 为什么选择我们 */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 24px 8px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={2} style={{ marginBottom: 8 }}>
            {tr('为什么选择我们')}
          </Title>
          <Text style={{ color: '#8a6b4d' }}>
            {tr('面包这件事，没有捷径，只有"什么时候烤"和"多久送到"')}
          </Text>
        </div>
        <Row gutter={[20, 20]}>
          {FEATURES.map((f) => (
            <Col xs={24} sm={12} lg={8} key={f.title}>
              <Card
                style={{ height: '100%', borderRadius: 14, border: '1px solid #f2e0c9', background: '#fffdf9' }}
                styles={{ body: { padding: 22 } }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: '#fff2d6',
                    color: '#d9821b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                    marginBottom: 14,
                  }}
                >
                  {f.icon}
                </div>
                <Title level={4} style={{ marginTop: 0, marginBottom: 8 }}>
                  {f.title}
                </Title>
                <Paragraph style={{ marginBottom: 0, color: '#7a5c3e' }}>{f.desc}</Paragraph>
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      {/* 预定流程 */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 24px 8px' }}>
        <div
          style={{
            background: '#fff4e2',
            border: '1px solid #f6e2c6',
            borderRadius: 16,
            padding: '32px 28px',
          }}
        >
          <Title level={3} style={{ marginTop: 0, textAlign: 'center' }}>
            {tr('预定流程：你说时间，我们说"出炉"')}
          </Title>
          <Row gutter={[20, 20]} style={{ marginTop: 12 }}>
            {STEPS.map((s) => (
              <Col xs={24} sm={12} lg={6} key={s.no}>
                <div style={{ textAlign: 'center', padding: '8px 4px' }}>
                  <div style={{ fontSize: 30, fontWeight: 800, color: '#e8a33d' }}>{s.no}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, margin: '6px 0' }}>{s.title}</div>
                  <div style={{ color: '#8a6b4d', fontSize: 13 }}>{s.desc}</div>
                </div>
              </Col>
            ))}
          </Row>
        </div>
      </div>

      {/* 底部 CTA：黄色大按钮 */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '56px 24px 72px', textAlign: 'center' }}>
        <Title level={2} style={{ marginBottom: 6 }}>
          {tr('今天就吃刚出炉的')}
        </Title>
        <Paragraph style={{ color: '#8a6b4d', fontSize: 16 }}>
          {tr('预定你的出炉时间，我们现做现送')}
        </Paragraph>
        <Button
          size="large"
          onClick={() => navigate('/login')}
          style={{
            marginTop: 12,
            background: '#ffd400',
            borderColor: '#ffd400',
            color: '#5a3b00',
            height: 64,
            padding: '0 64px',
            fontSize: 22,
            fontWeight: 800,
            borderRadius: 999,
            boxShadow: '0 10px 24px rgba(255, 200, 0, 0.45)',
          }}
        >
          {tr('现在购买')}
        </Button>
        <div style={{ marginTop: 18 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {tr('已有账号？')}<a onClick={() => navigate('/login')}>{tr('直接登录')}</a>
          </Text>
        </div>
      </div>
    </div>
  )
}
