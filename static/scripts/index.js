// Smooth scroll to top
function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

// Show about information
// function showAbout() {
// }

// Sidebar
function showSidebar() {
  document.getElementById("sidebar").classList.add("active");
  document.querySelector("sidebar-overlay").classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeSidebar() {
  document.getElementById("sidebar").classList.remove("active");
  document.querySelector("sidebar-overlay").classList.remove("active");
  document.body.style.overflow = "auto";
}

function showInfo() {
  document.getElementById("sidebarTitle").textContent =
    "Information about project";
  document.getElementById("sidebarContent").innerHTML = `
        <h3>About Cyborg ID</h3>
        <p>This project explores the creative and philosophical role of AI in artistic research, moving beyond its common use as a tool to question its potential as an agent and speculative subject. Working with generative systems, we examine how AI can reflect, shape, and destabilize notions of identity, agency, and the human-machine boundary.</p>
        <h3>Theoretical Foundations</h3>
        <p>Inspired by thinkers like Donna Haraway and Deleuze & Guattari, we reject linear frameworks in favor of multiplicity and fluidity. These philosophical influences guide our exploration of identity not as fixed or singular, but as distributed, unstable, and co-constructed through interaction with technology.</p>
        <h3>Interactive Installation</h3>
        <p>Our main intervention—a digital installation—invites users to submit identity data, which is used to generate unique AI personas. These personas then interact, perform shifting subjectivities, and embody unstable forms of identity. Each interaction is different, shaped by algorithmic logic and human input.</p>
        <h3>AI as Mirror and Provocateur</h3>
        <p>Through this, AI becomes both mirror and provocateur, blurring the line between instrument and participant. The installation challenges the passive role of machines, allowing AI to act as a speculative subject that co-creates and questions identity alongside the human.</p>
        <h3>Speculative Identity and Digital Fluidity</h3>
        <p>The work merges code, visuals, and theory to explore emergent agency, digital fluidity, and speculative identity. It investigates how identity might be reimagined in systems where emotion, fiction, and algorithm converge.</p>
        <h3>Conclusion</h3>
        <p>Ultimately, the project is a space where emotion, fiction, and algorithm meet—reimagining how identity can be performed and transformed in a machinic world.</p>
    `;
  showSidebar();
}

function showAbout() {
  document.getElementById("sidebarTitle").textContent = "About us";
  document.getElementById("sidebarContent").innerHTML = ` 
  <div class="person">
    <h3>Evgenia</h3>
    <p>Креативный мыслитель, исследует психологию, визуальную эстетику и сторителлинг. Обожает создавать смыслы через искусство и текст.</p>
    <a href="https://www.instagram.com/readheadthoughts?igsh=MXYzaTh3OTM5OHFraQ==" target="_blank">Instagram</a>
  </div>

  <div class="person">
    <h3>Sofia</h3>
    <p>UX/UI дизайнер и фронтенд-разработчица с тонким чувством стиля. Создаёт интерфейсы, которые не просто работают — они радуют пользователя.</p>
    <a href="https://www.instagram.com/sofiia.oli?igsh=MTd0Zmdpd3hoeHdyMQ==" target="_blank">Instagram</a>
  </div>

  <div class="person">
    <h3>Aleksandr</h3>
    <p>Full stack разработчик и UX/UI дизайнер. Совмещает техническую точность с визуальной гармонией, создавая веб-продукты с душой.</p>
    <a href="https://www.instagram.com/chesterlink95?igsh=MXZneWZ4aTRmbHp0bg==" target="_blank">Instagram</a>
  </div>
`;
  showSidebar();
}

document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    closeSidebar();
  }
});

// Add loading effect
window.addEventListener("load", function () {
  document.body.style.opacity = "1";
});

// Optimize video loading
document.addEventListener("DOMContentLoaded", function () {
  const video = document.querySelector("video");
  if (video) {
    video.addEventListener("loadstart", function () {
      console.log("Video loading started");
    });

    video.addEventListener("canplay", function () {
      console.log("Video ready to play");
    });

    video.addEventListener("error", function (e) {
      console.error("Video loading error:", e);
      // Fallback: hide video container or show alternative content
      this.parentElement.style.background =
        "linear-gradient(135deg, #000428, #004e92)";
    });
  }
});

// Performance optimization: Pause video when tab is not visible
document.addEventListener("visibilitychange", function () {
  const video = document.querySelector("video");
  if (video) {
    if (document.hidden) {
      video.pause();
    } else {
      video.play();
    }
  }
});
