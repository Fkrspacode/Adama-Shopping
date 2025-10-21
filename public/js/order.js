 document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === '1') {
      document.getElementById('successModal').style.display = 'block';
    }

    // Pay button modal
    document.querySelectorAll('.pay-btn[data-orderid]').forEach(btn => {
      btn.addEventListener('click', () => {
        showBankInfo(
          btn.dataset.bank || 'N/A',
          btn.dataset.account || 'N/A',
          btn.dataset.number || 'N/A',
          btn.dataset.orderid
        );
      });
    });

    document.getElementById('bankForm').addEventListener('submit', function(e) {
      e.preventDefault();
      const form = e.target;
      const orderId = document.getElementById('modalOrderId').value;
      const buyerAccountName = form.buyer_account_name.value;
      const buyerAccountNumber = form.account_number.value;

      fetch(`/order/pay/${orderId}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: `buyer_account_name=${encodeURIComponent(buyerAccountName)}&account_number=${encodeURIComponent(buyerAccountNumber)}`
      }).then(res => {
        if (res.ok) window.location.href = '/order?success=1';
      });
    });

    // Image preview modal
    document.querySelectorAll('.order img.post-image').forEach(img => {
      img.addEventListener('click', () => {
        document.getElementById('modalImage').src = img.src;
        document.getElementById('imageModal').style.display = 'flex';
      });
    });
  });

  function closeModal() {
    document.getElementById('successModal').style.display = 'none';
    const url = new URL(window.location);
    url.searchParams.delete('success');
    window.history.replaceState({}, document.title, url);
  }

  function showBankInfo(bankName, accountName, accountNumber, orderId) {
    document.getElementById('modalBankName').innerText = bankName;
    document.getElementById('modalAccountName').innerText = accountName;
    document.getElementById('modalAccountNumber').innerText = accountNumber;
    document.getElementById('modalOrderId').value = orderId;
    document.getElementById('bankModal').style.display = 'block';
  }

  function closeBankModal() {
    document.getElementById('bankModal').style.display = 'none';
  }

  function copyAccountNumber() {
    const number = document.getElementById('modalAccountNumber').innerText;
    navigator.clipboard.writeText(number).then(() => alert('Account number copied!'));
  }

  function closeImageModal() {
    document.getElementById('imageModal').style.display = 'none';
  }