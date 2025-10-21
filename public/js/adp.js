function togglePaidOrders(index) {
    document.querySelectorAll('.buyer-orders').forEach((el, i) => { if (i !== parseInt(index)) el.style.display = 'none'; });
    const el = document.getElementById('paid-orders-' + index + '-content');
    if (el.style.display === 'block') el.style.display = 'none';
    else el.style.display = 'block';
  }