(function () {
  "use strict";

  var PAGE_KEY = location.pathname;

  function orderKey(section) {
    return "kit:" + PAGE_KEY + ":order:" + section;
  }

  function qtyKey(section, item) {
    return "kit:" + PAGE_KEY + ":qty:" + section + ":" + item;
  }

  function applySavedOrder(grid) {
    var section = grid.dataset.section;
    var saved = localStorage.getItem(orderKey(section));
    if (!saved) return;
    var order;
    try {
      order = JSON.parse(saved);
    } catch (e) {
      return;
    }
    var cards = {};
    grid.querySelectorAll(".item-card").forEach(function (card) {
      cards[card.dataset.item] = card;
    });
    order.forEach(function (itemId) {
      var card = cards[itemId];
      if (card) grid.appendChild(card);
    });
  }

  function applySavedQty(input) {
    var card = input.closest(".item-card");
    var section = card.dataset.section;
    var item = card.dataset.item;
    var saved = localStorage.getItem(qtyKey(section, item));
    if (saved !== null) input.value = saved;
  }

  function saveOrder(grid) {
    var section = grid.dataset.section;
    var ids = Array.prototype.map.call(
      grid.querySelectorAll(".item-card"),
      function (c) { return c.dataset.item; }
    );
    localStorage.setItem(orderKey(section), JSON.stringify(ids));
  }

  function getDragAfterElement(grid, x, y) {
    var cards = Array.prototype.filter.call(
      grid.querySelectorAll(".item-card"),
      function (c) { return !c.classList.contains("dragging"); }
    );
    var closest = null;
    var closestDistance = Infinity;
    cards.forEach(function (card) {
      var box = card.getBoundingClientRect();
      var centerX = box.left + box.width / 2;
      var centerY = box.top + box.height / 2;
      var distance = Math.hypot(x - centerX, y - centerY);
      if (distance < closestDistance) {
        closestDistance = distance;
        closest = card;
      }
    });
    return closest;
  }

  function setupGrid(grid) {
    applySavedOrder(grid);

    var draggedCard = null;

    grid.addEventListener("dragstart", function (e) {
      var card = e.target.closest(".item-card");
      if (!card) return;
      draggedCard = card;
      card.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
    });

    grid.addEventListener("dragend", function (e) {
      var card = e.target.closest(".item-card");
      if (!card) return;
      card.classList.remove("dragging");
      draggedCard = null;
      saveOrder(grid);
      // Suppress the click that follows a drag so it doesn't also open the product link.
      card.dataset.justDragged = "true";
      setTimeout(function () { card.dataset.justDragged = ""; }, 0);
    });

    grid.addEventListener("dragover", function (e) {
      e.preventDefault();
      if (!draggedCard) return;
      var afterElement = getDragAfterElement(grid, e.clientX, e.clientY);
      if (!afterElement || afterElement === draggedCard) {
        if (!afterElement) grid.appendChild(draggedCard);
        return;
      }
      var rect = afterElement.getBoundingClientRect();
      var insertBefore = e.clientX < rect.left + rect.width / 2;
      if (insertBefore) {
        grid.insertBefore(draggedCard, afterElement);
      } else {
        grid.insertBefore(draggedCard, afterElement.nextSibling);
      }
    });

    grid.querySelectorAll(".qty-input").forEach(function (input) {
      applySavedQty(input);

      // Prevent the card's drag behavior from hijacking clicks/typing in the input.
      input.addEventListener("mousedown", function () {
        input.closest(".item-card").setAttribute("draggable", "false");
      });
      input.addEventListener("mouseup", function () {
        input.closest(".item-card").setAttribute("draggable", "true");
      });

      input.addEventListener("change", function () {
        var card = input.closest(".item-card");
        localStorage.setItem(qtyKey(card.dataset.section, card.dataset.item), input.value);
      });

      input.addEventListener("click", function (e) {
        e.stopPropagation();
      });
    });

    grid.querySelectorAll(".item-shop-link").forEach(function (link) {
      link.addEventListener("mousedown", function () {
        link.closest(".item-card").setAttribute("draggable", "false");
      });
      link.addEventListener("mouseup", function () {
        link.closest(".item-card").setAttribute("draggable", "true");
      });
      link.addEventListener("click", function (e) {
        if (link.getAttribute("href") === "#") e.preventDefault();
        // Let the anchor's own target="_blank" navigation happen; don't also
        // trigger the card-level click-to-open handler below.
        e.stopPropagation();
      });
    });

    // Clicking anywhere else on the card opens its product link in a new tab.
    grid.addEventListener("click", function (e) {
      var card = e.target.closest(".item-card");
      if (!card) return;
      if (e.target.closest(".qty-input") || e.target.closest(".item-shop-link")) return;
      if (card.dataset.justDragged === "true") return;
      var link = card.querySelector(".item-shop-link");
      if (link && link.getAttribute("href") && link.getAttribute("href") !== "#") {
        window.open(link.href, "_blank", "noopener");
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".item-grid").forEach(setupGrid);

    var resetBtn = document.querySelector(".reset-layout-btn");
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        if (!confirm("Reset item order and quantities back to the original kit defaults?")) return;
        var prefix = "kit:" + PAGE_KEY + ":";
        Object.keys(localStorage)
          .filter(function (k) { return k.indexOf(prefix) === 0; })
          .forEach(function (k) { localStorage.removeItem(k); });
        location.reload();
      });
    }
  });
})();
