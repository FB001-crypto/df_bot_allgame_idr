import crypto from 'crypto';

export function randomDigits(length) {
  let output = '';
  while (output.length < length) {
    const buf = crypto.randomBytes(length);
    for (let i = 0; i < buf.length && output.length < length; i += 1) {
      const digit = buf[i] % 10;
      output += String(digit);
    }
  }
  return output;
}

export function generateUsername() {
  // 新格式：Promo{2位数字}{3位字母/数字}_DF，例如 Promo02ab2_DF
  const alphaNum = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const digits = '0123456789';
  const b = crypto.randomBytes(3);
  const d1 = digits[b[0] % 10];
  const d2 = digits[b[1] % 10];
  // 3位混合
  const b2 = crypto.randomBytes(3);
  let mix = '';
  for (let i = 0; i < 3; i += 1) {
    mix += alphaNum[b2[i] % alphaNum.length];
  }
  return `Promo${d1}${d2}${mix}_DF`;
}

export function generatePassword() {
  // 8 位字母数字随机密码
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(8);
  let pwd = '';
  for (let i = 0; i < 8; i += 1) {
    pwd += chars[bytes[i] % chars.length];
  }
  return pwd;
}
