module.exports = async (t) => {
  await t.go("https://marianvassilev1978-cyber.github.io/noir-chess/"); await t.wait(6000);
  console.log("engine:", await t.eval("document.querySelector('.tiny.dim') && document.querySelector('.tiny.dim').textContent"));
  console.log("sw:", await t.eval("navigator.serviceWorker.getRegistration().then(r=>r?'registered':'none')"));
  await t.shot("50-live-home");
};
