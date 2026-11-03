module.exports = async (t) => {
  await t.go("index.html#/settings"); await t.wait(1500);
  await t.eval("document.querySelector('.tsnd').scrollIntoView({block:'center'})"); await t.wait(300);
  const [x, y] = await t.eval("(()=>{const r=document.querySelector('.tsnd').getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]})()");
  for (const type of ["touchStart", "touchEnd"]) await t.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] });
  await t.wait(1500);
  console.log("state:", await t.eval("document.querySelector('.ast').textContent"));
  console.log("playing:", await t.eval("window.__lastPlay||'?'"));
};
