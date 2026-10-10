// "Ask a question" buttons open the on-site assistant for instant answers, prices and open times.
// Other pages link to /#ask, which opens it on arrival. Without the assistant, the link does nothing harmful.
const input = () => document.querySelector('.concierge input');
function openChat() {
  const launch = document.querySelector('.concierge-launch');
  if (!launch) return false;
  const panel = document.querySelector('.concierge-panel');
  if (!panel || panel.hidden) launch.click();
  setTimeout(() => input()?.focus(), 250);
  return true;
}
document.addEventListener('click', (event) => {
  const link = event.target.closest('[data-open-chat]');
  if (link && openChat()) event.preventDefault();
});
if (location.hash === '#ask') {
  const go = () => setTimeout(openChat, 400);
  if (document.readyState === 'complete') go(); else window.addEventListener('load', go);
}
