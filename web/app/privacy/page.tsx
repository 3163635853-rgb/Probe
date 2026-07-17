import Link from "next/link";

const SECTIONS = [
  ["我们收集的信息", "账号信息（邮箱、微信 OpenID、昵称和头像）、面试配置、回答内容、评分报告、设备推送标识，以及保障服务安全所需的基础日志。"],
  ["信息用途", "用于提供面试训练、生成反馈报告、维护跨面试能力画像、发放权益、发送用户主动开启的通知，以及排查故障和防止滥用。"],
  ["AI 与第三方服务", "回答内容会按功能需要发送给已配置的模型、语音、微信支付和 Expo Push 服务。我们只传递完成对应功能所需的数据。"],
  ["保存与删除", "面试记录会保存在账户中供复盘使用。用户可以通过反馈渠道申请导出或删除账户及关联数据；依法必须保留的交易记录除外。"],
  ["安全措施", "访问令牌、支付回调和文件读取均进行权限校验；敏感凭证不会写入客户端或公开仓库。任何互联网服务都无法保证绝对安全。"],
  ["未成年人", "Probe 面向求职训练用户。未满法定年龄的用户应在监护人同意和指导下使用。"],
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen px-5 py-16 sm:px-8">
      <article className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-semibold text-primary">← 返回 Probe</Link>
        <h1 className="mt-8 text-4xl font-bold tracking-tight">隐私政策</h1>
        <p className="mt-3 text-sm text-muted-foreground">生效日期：2026 年 7 月 17 日</p>
        <p className="mt-8 leading-8 text-muted-foreground">本政策说明 Probe 在提供 AI 面试训练服务时如何处理个人信息。使用服务即表示你已阅读本政策。</p>
        <div className="mt-10 space-y-9">
          {SECTIONS.map(([title, content]) => (
            <section key={title}>
              <h2 className="text-xl font-semibold">{title}</h2>
              <p className="mt-3 leading-8 text-muted-foreground">{content}</p>
            </section>
          ))}
          <section>
            <h2 className="text-xl font-semibold">联系我们</h2>
            <p className="mt-3 leading-8 text-muted-foreground">如需行使数据权利或反馈隐私问题，请通过 App/Web 的“帮助与反馈”提交请求。</p>
          </section>
        </div>
      </article>
    </main>
  );
}
