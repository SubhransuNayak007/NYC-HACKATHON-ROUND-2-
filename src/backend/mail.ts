import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Escape HTML special characters to prevent injection attacks
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function sendCouponEmail(
  to: string,
  name: string,
  couponCode: string,
  planName: string
): Promise<boolean> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Sanitize all user-controlled values before interpolation
    const safeName = escapeHtml(name);
    const safePlanName = escapeHtml(planName);
    const safeCouponCode = escapeHtml(couponCode);
    const safeTo = escapeHtml(to);

    await transporter.sendMail({
      from: `"Quick Reply" <${process.env.SMTP_USER}>`,
      to,
      subject: "Your Quick Reply Premium Code is Ready!",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Quick Reply Premium Code</title>
</head>
<body style="margin:0;padding:0;background-color:#08090A;font-family:'Segoe UI',Roboto,Arial,sans-serif;color:#ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#08090A;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#0F1012;border-radius:12px;overflow:hidden;border:1px solid #1F2023;">
          <!-- Header -->
          <tr>
            <td style="background-color:#FF3B30;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">Quick Reply</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Premium Access Activated</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 16px;color:#ffffff;font-size:16px;line-height:1.6;">
                Hi <strong>${safeName}</strong>,
              </p>
              <p style="margin:0 0 24px;color:#a0a0a0;font-size:15px;line-height:1.6;">
                Thank you for purchasing the <strong style="color:#FF3B30;">${safePlanName}</strong> plan! Your premium coupon code is ready to use:
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
                <tr>
                  <td align="center" style="background-color:#161719;border:2px dashed #FF3B30;border-radius:8px;padding:20px;">
                    <span style="font-family:monospace;font-size:24px;font-weight:700;letter-spacing:2px;color:#FF3B30;">${safeCouponCode}</span>
                  </td>
                </tr>
              </table>

              <h3 style="color:#ffffff;font-size:16px;margin:24px 0 12px;">How to activate:</h3>
              <ol style="margin:0;padding-left:20px;color:#a0a0a0;font-size:14px;line-height:1.8;">
                <li>Go to your <a href="${escapeHtml(appUrl)}/dashboard" style="color:#FF3B30;text-decoration:none;font-weight:600;">Quick Reply Dashboard</a>.</li>
                <li>Enter this code in the coupon field in the Workspace Overview section.</li>
                <li>Click <strong>Redeem</strong> to instantly upgrade your account to Premium.</li>
              </ol>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#161719;padding:24px 40px;text-align:center;border-top:1px solid #1F2023;">
              <p style="margin:0;color:#666666;font-size:12px;line-height:1.5;">
                This email was sent to ${safeTo} for your Quick Reply purchase.<br />
                &copy; ${new Date().getFullYear()} Quick Reply. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });
    return true;
  } catch (error) {
    console.error("Error sending coupon email");
    return false;
  }
}