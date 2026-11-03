module.exports = async (t) => {
  await t.go("index.html#/course"); await t.wait(1500);
  await t.eval("document.querySelector('.unit:nth-child(9)').scrollIntoView()"); await t.wait(200); await t.shot("30-course-l9");
  await t.go("index.html#/lesson/l10-iqp"); await t.wait(1500);
  for (let i = 0; i < 8; i++) { const c = await t.eval("!!document.querySelector('.opt')"); if (c) break; await t.eval("document.querySelector('.nextb').disabled=false;document.querySelector('.nextb').click()"); await t.wait(300); }
  await t.shot("31-choice");
  await t.go("index.html#/endgames"); await t.wait(1200); await t.shot("32-gym");
  await t.go("index.html#/drill/" + (await t.eval("document.querySelector('.lesson-row') ? 'x' : ''") ? "" : "")); 
  await t.go("index.html#/endgames"); await t.wait(800);
  await t.eval("document.querySelector('.lesson-row').click()"); await t.wait(1500);
  await t.shot("33-drill");
  await t.go("index.html#/openings/openings"); await t.wait(1500); await t.shot("34-openings");
  await t.go("index.html#/plan"); await t.wait(1500); await t.fullshot("35-plan");
  await t.go("index.html#/library"); await t.wait(1500); await t.shot("36-library");
};
