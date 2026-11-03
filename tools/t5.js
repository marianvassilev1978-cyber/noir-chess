module.exports = async (t) => {
  await t.go("index.html#/endgames"); await t.wait(800);
  await t.eval("document.querySelector('.lesson-row').click()"); await t.wait(1500);
  const fen = await t.eval("document.querySelector('.board') && 1");
  await t.move("b1", "b4", "w", "#gb"); await t.wait(4000);
  await t.move("e1", "e2", "w", "#gb"); await t.wait(4000);
  console.log("status:", await t.eval("(document.querySelector('.gs .fb')||{}).textContent"), await t.eval("document.querySelector('.mv').textContent"));
  await t.shot("37-drill-play");
};
