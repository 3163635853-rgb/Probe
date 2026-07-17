import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="min-h-screen px-5 py-16 sm:px-8">
      <article className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-semibold text-primary">← 返回 Probe</Link>
        <h1 className="mt-8 text-4xl font-bold tracking-tight">用户协议</h1>
        <p className="mt-3 text-sm text-muted-foreground">生效日期：2026 年 7 月 17 日</p>
        <div className="mt-10 space-y-9 leading-8 text-muted-foreground">
          <section><h2 className="text-xl font-semibold text-foreground">服务说明</h2><p className="mt-3">Probe 提供 AI 模拟面试、语音转写、评分报告、成长记录及相关会员服务。AI 生成内容仅用于训练参考，不构成招聘结果、职业或法律承诺。</p></section>
          <section><h2 className="text-xl font-semibold text-foreground">账号责任</h2><p className="mt-3">用户应提供合法信息并妥善保管账号凭证，不得冒用他人身份、攻击服务、批量滥用接口或上传违法侵权内容。</p></section>
          <section><h2 className="text-xl font-semibold text-foreground">付费与权益</h2><p className="mt-3">套餐价格和权益以购买页面为准。支付成功后系统自动履约；出现异常可通过反馈入口提交订单信息。依法应退款的情形按适用法律和支付渠道规则处理。</p></section>
          <section><h2 className="text-xl font-semibold text-foreground">内容与知识产权</h2><p className="mt-3">用户保留其原创回答的权利，并授权 Probe 在提供服务所必需的范围内处理这些内容。Probe 的软件、界面、题库和品牌素材受相关法律保护。</p></section>
          <section><h2 className="text-xl font-semibold text-foreground">服务变更与责任限制</h2><p className="mt-3">我们会持续改进模型和产品，并尽力保障可用性。因网络、第三方平台、不可抗力或用户设备导致的中断，将在合理范围内修复和协助处理。</p></section>
          <section><h2 className="text-xl font-semibold text-foreground">联系我们</h2><p className="mt-3">协议、退款或账号问题可通过 App/Web 的“帮助与反馈”提交。</p></section>
        </div>
      </article>
    </main>
  );
}
