module.exports = async (t) => {
  const tap = async (sel) => {
    await t.eval(`document.querySelector(${JSON.stringify(sel)}).scrollIntoView({block:'center'})`); await t.wait(200);
    const [x, y] = await t.eval(`(()=>{const r=document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]})()`);
    await t.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    await t.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  };
  if (process.env.NOWA) await t.send("Page.addScriptToEvaluateOnNewDocument", { source: "delete window.AudioContext; delete window.webkitAudioContext;" });
  await t.go("index.html#/settings"); await t.wait(1500);
  console.log("before tap:", JSON.stringify(await t.eval("window.__noirSound()")));
  await tap(".tsnd"); await t.wait(2500);
  console.log("after test:", JSON.stringify(await t.eval("window.__noirSound()")), "|", await t.eval("document.querySelector('.ast').textContent"));
  // play a game: sounds for moves
  await tap('#nav button[data-nav="play"]'); await t.wait(1200);
  await tap(".start"); await t.wait(1500);
  await t.move("e2", "e4", "w", "#bd"); await t.wait(3500);
  await t.move("g1", "f3", "w", "#bd"); await t.wait(3500);
  console.log("moves:", await t.eval("document.querySelector('#ml').textContent"));
  console.log("after game moves:", JSON.stringify(await t.eval("window.__noirSound()")));
};
