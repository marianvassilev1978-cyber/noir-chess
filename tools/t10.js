module.exports = async (t) => {
  await t.go("index.html#/settings"); await t.wait(1200);
  for (const set of ["sfx", "piano", "wood"]) {
    await t.eval(`(()=>{const s=document.querySelector('.ss');s.value='${set}';s.dispatchEvent(new Event('change'))})()`);
    await t.eval("document.querySelector('.tsnd').scrollIntoView({block:'center'})"); await t.wait(200);
    const [x, y] = await t.eval("(()=>{const r=document.querySelector('.tsnd').getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]})()");
    await t.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    await t.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await t.wait(2500);
    console.log(set, JSON.stringify(await t.eval("window.__noirSound()")));
  }
};
