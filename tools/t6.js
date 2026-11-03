module.exports = async (t) => {
  await t.go("index.html#/play"); await t.wait(1500); await t.shot("40-desk-play");
  await t.click(".start"); await t.wait(1500);
  await t.move("e2", "e4", "w", "#bd"); await t.wait(4000);
  await t.shot("41-desk-game");
  await t.go("index.html#/home"); await t.wait(1000); await t.shot("42-desk-home");
};
