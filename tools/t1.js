module.exports = async (t) => {
  await t.go("index.html#/home");
  await t.wait(2500);
  await t.shot("01-home");
  console.log("engine:", await t.eval("document.querySelector('.tiny.dim') && document.querySelector('.tiny.dim').textContent"));
  await t.go("index.html#/play"); await t.wait(800); await t.shot("02-play");
  await t.go("index.html#/puzzles"); await t.wait(800); await t.shot("03-puzzles");
  await t.go("index.html#/learn"); await t.wait(1200); await t.shot("04-learn");
  await t.go("index.html#/course"); await t.wait(1200); await t.shot("05-course");
  await t.go("index.html#/profile"); await t.wait(600); await t.shot("06-profile");
  await t.go("index.html#/settings"); await t.wait(800); await t.shot("07-settings");
};
