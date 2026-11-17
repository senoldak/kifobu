/** Mecmua saat'e Telegram bildirimi yollar. Hiçbir durumda fırlatmaz; başarıyı true/false döner. */
export async function bildir(
  metin: string,
  ortam: { MOTOR_URL?: string; MOTOR_ANAHTARI?: string },
  fetchFn: typeof fetch = fetch,
): Promise<boolean> {
  if (!ortam.MOTOR_URL || !ortam.MOTOR_ANAHTARI) {
    console.log('  ! Bildirim gönderilmedi: MOTOR_URL veya MOTOR_ANAHTARI yok.');
    return false;
  }
  try {
    const yanit = await fetchFn(`${ortam.MOTOR_URL.replace(/\/+$/, '')}/motor/kifobu/bildirim`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ortam.MOTOR_ANAHTARI}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ metin: metin.slice(0, 3500) }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!yanit.ok) {
      console.log(`  ! Bildirim gönderilemedi: HTTP ${yanit.status}`);
      return false;
    }
    return true;
  } catch (e: any) {
    console.log(`  ! Bildirim gönderilemedi: ${String(e?.message ?? e).split(ortam.MOTOR_ANAHTARI).join('***')}`);
    return false;
  }
}
