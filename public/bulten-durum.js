// Bülten sayfasında yalnız adres çubuğundaki ?durum= değerine uyan kutuyu gösterir. JS kapalıysa sayfadaki genel
// açıklama görünür; kutular gizli kalır.
(function () {
  try {
    var durum = new URLSearchParams(window.location.search).get('durum');
    if (!durum) return;
    var kutular = document.querySelectorAll('.bulten-kutu[data-durum]');
    for (var i = 0; i < kutular.length; i++) {
      if (kutular[i].getAttribute('data-durum') === durum) kutular[i].hidden = false;
    }
  } catch (e) {
    // Adres çubuğu okunamazsa genel açıklama yeterlidir.
  }
})();
