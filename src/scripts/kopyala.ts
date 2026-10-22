// "Bağlantıyı kopyala": Pano API'si varsa düğmeyi gösterir, tıklanınca sayfa adresini kopyalar.
for (const dugme of document.querySelectorAll<HTMLButtonElement>('button[data-kopyala]')) {
  if (!navigator.clipboard?.writeText) continue;
  dugme.hidden = false;
  const durum = dugme.parentElement?.querySelector<HTMLElement>('.kopyala-durum');
  dugme.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(dugme.dataset.kopyala ?? location.href);
      if (durum) durum.textContent = 'Bağlantı kopyalandı.';
    } catch {
      if (durum) durum.textContent = 'Kopyalanamadı; adres çubuğundan kopyalayın.';
    }
  });
}
