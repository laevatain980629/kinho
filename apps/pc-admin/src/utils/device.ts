export function isMobileBrowser(userAgent = navigator.userAgent) {
  return /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(userAgent);
}

export function shouldRedirectToMobile() {
  if (!isMobileBrowser()) return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get('desktop') === '1') return false;
  if (localStorage.getItem('preferDesktop') === '1') return false;
  return true;
}
