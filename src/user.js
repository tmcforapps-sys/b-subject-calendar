import { loadActivities, generateCalendar } from './main.js';

loadActivities();
generateCalendar();

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".draggable-item, .activity-item").forEach(el => {
    el.setAttribute("draggable", false);
  });
});
