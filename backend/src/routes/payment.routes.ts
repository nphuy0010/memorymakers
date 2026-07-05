/* THANH TOÁN MOMO (AIO v2) — verify chữ ký server-side, KHÔNG tin client.
   - POST /momo/create : tính tiền từ bảng giá template (server), tạo yêu cầu MoMo có chữ ký HMAC-SHA256
   - POST /momo/ipn    : MoMo gọi về -> verify chữ ký + số tiền -> mới đánh dấu ĐÃ THANH TOÁN
   - GET  /status/:id  : client poll trạng thái đơn
   - MOMO_ENABLED != "true" -> chế độ DEMO có kiểm soát: /demo-confirm (tiền vẫn tính server-side)  */
import { Router } from "express";
import crypto from "crypto";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { computeAmount } from "../lib/business";
import { z } from "zod";
import { validate, orderSchema } from "../lib/validate";

const router = Router();

const MOMO_ON = process.env.MOMO_ENABLED === "true";
const CFG = {
  endpoint: process.env.MOMO_ENDPOINT || "https://test-payment.momo.vn", // sandbox mặc định
  partnerCode: process.env.MOMO_PARTNER_CODE || "",
  accessKey: process.env.MOMO_ACCESS_KEY || "",
  secretKey: process.env.MOMO_SECRET_KEY || "",
};
const hmac = (raw: string) => crypto.createHmac("sha256", CFG.secretKey).update(raw).digest("hex");

// Ghi lựa chọn mua vào project (mode/option/amount/address) — trạng thái vẫn CHƯA thanh toán
async function preparePurchase(projectId: string, userId: string, body: any) {
  const project = await prisma.project.findFirst({ where: { id: projectId, userId }, include: { template: true } });
  if (!project) throw Object.assign(new Error("Không tìm thấy dự án"), { status: 404 });
  const amount = computeAmount(body.mode, body.option, project.template as any);
  const option = body.mode === "digital" ? "digital" : body.option;
  await prisma.project.update({
    where: { id: project.id },
    data: { mode: body.mode, option, amount, address: body.address ? JSON.stringify(body.address) : null },
  });
  return { project, amount };
}

// Tạo yêu cầu thanh toán
router.post("/momo/create", requireAuth, validate(orderSchema.extend({ projectId: z.string().min(1) })), async (req: AuthRequest, res) => {
  const projectId = String(req.body.projectId);
  const { amount, project } = await preparePurchase(projectId, req.userId!, req.body);

  if (!MOMO_ON) return res.json({ demo: true, amount }); // chưa cấu hình MoMo -> chạy demo

  const requestId = crypto.randomUUID();
  const orderId = `MM-${project.id}-${Date.now()}`;
  const orderInfo = `Memory Makers - ${project.title}`.slice(0, 200);
  const redirectUrl = `${process.env.FRONTEND_ORIGIN || "http://localhost:3000"}/account`;
  const ipnUrl = `${process.env.PUBLIC_URL || ""}/api/payments/momo/ipn`;
  const extraData = Buffer.from(JSON.stringify({ projectId: project.id })).toString("base64");
  const requestType = "captureWallet";
  const raw = `accessKey=${CFG.accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${CFG.partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;
  const body = { partnerCode: CFG.partnerCode, accessKey: CFG.accessKey, requestId, amount: String(amount), orderId, orderInfo, redirectUrl, ipnUrl, extraData, requestType, signature: hmac(raw), lang: "vi" };

  const r = await fetch(`${CFG.endpoint}/v2/gateway/api/create`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data: any = await r.json();
  if (data.resultCode !== 0) return res.status(502).json({ error: "MoMo từ chối: " + (data.message || data.resultCode) });
  res.json({ payUrl: data.payUrl, deeplink: data.deeplink, qrCodeUrl: data.qrCodeUrl, amount });
});

// IPN: MoMo gọi về khi khách trả tiền — NGUỒN SỰ THẬT duy nhất để đánh dấu đã thanh toán
router.post("/momo/ipn", async (req, res) => {
  try {
    const b = req.body || {};
    const raw = `accessKey=${CFG.accessKey}&amount=${b.amount}&extraData=${b.extraData}&message=${b.message}&orderId=${b.orderId}&orderInfo=${b.orderInfo}&orderType=${b.orderType}&partnerCode=${b.partnerCode}&payType=${b.payType}&requestId=${b.requestId}&responseTime=${b.responseTime}&resultCode=${b.resultCode}&transId=${b.transId}`;
    if (hmac(raw) !== b.signature) { console.warn("MoMo IPN: SAI CHỮ KÝ"); return res.status(400).end(); }
    if (Number(b.resultCode) !== 0) return res.status(204).end(); // giao dịch thất bại/hủy

    const { projectId } = JSON.parse(Buffer.from(String(b.extraData || ""), "base64").toString() || "{}");
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return res.status(204).end();
    if (Number(b.amount) !== project.amount) { console.warn("MoMo IPN: LỆCH SỐ TIỀN", b.amount, project.amount); return res.status(204).end(); }

    await prisma.project.update({ where: { id: projectId }, data: { status: "PURCHASED", tracking: `MOMO:${b.transId}` } });
    res.status(204).end();
  } catch (e: any) { console.error("IPN lỗi:", e?.message); res.status(204).end(); }
});

// Poll trạng thái đơn (client dùng sau khi mở QR)
router.get("/status/:id", requireAuth, async (req: AuthRequest, res) => {
  const p = await prisma.project.findFirst({ where: { id: req.params.id, userId: req.userId }, select: { status: true, amount: true } });
  if (!p) return res.status(404).json({ error: "Không tìm thấy" });
  res.json(p);
});

// DEMO có kiểm soát (khi chưa bật MoMo): tiền vẫn tính server-side, đơn ghi rõ DEMO
router.post("/demo-confirm/:id", requireAuth, validate(orderSchema), async (req: AuthRequest, res) => {
  if (MOMO_ON) return res.status(400).json({ error: "Đang bật thanh toán thật — dùng MoMo" });
  const { project } = await preparePurchase(req.params.id, req.userId!, req.body);
  const p = await prisma.project.update({ where: { id: project.id }, data: { status: "PURCHASED", tracking: "DEMO-PAYMENT" }, include: { template: true } });
  res.json({ ...p, photos: JSON.parse(p.photos || "[]"), address: p.address ? JSON.parse(p.address) : null });
});

export default router;
