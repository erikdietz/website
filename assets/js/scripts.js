//= require vendor/jquery-3.4.1.min.js
//= require vendor/wobble.browser.min.js
//= require vendor/slick.min.js

function constructTransform(attrSprings) {
  const parts = [];
  if (attrSprings.translateX || attrSprings.translateY) {
    const vals = [
      attrSprings.translateX ? attrSprings.translateX.currentValue : 0,
      attrSprings.translateY ? attrSprings.translateY.currentValue : 0,
    ];
    parts.push("translate(" + vals.join(" ") + ")");
  }
  if (attrSprings.scale) {
    parts.push("scale(" + attrSprings.scale.currentValue + ")");
  }
  return parts.join(" ");
}

function setupScrollSpy() {
  var spyDimensions = [];
  var enterListeners = {};
  var leaveListeners = {};
  var mediaQueriesChecker = [];

  $("[data-attr-on-enter]").each(function() {
    var el = $(this);
    var attrSprings = {};
    var enable = true;

    var mediaQuery = el.data("only-animate-if-matches");
    if (mediaQuery && window.matchMedia) {
      var checkerFn = () => {
        var mql = window.matchMedia(mediaQuery);
        enable = mql.matches;
      };
      mediaQueriesChecker.push(checkerFn);
    }

    el.data("attr-on-enter")
      .trim()
      .split(/\s+/g)
      .forEach(part => {
        var m = part.trim().match(/(\w+):(.*)/);
        if (m) {
          var list = (enterListeners[m[1]] = enterListeners[m[1]] || []);
          m[2].split(",").map(attr => {
            var splitted = attr.split("=");
            var attr = splitted[0];
            var val = parseFloat(splitted[1]);
            var spring = attrSprings[attr];
            var isTransform = attr.indexOf("translate") === 0 || attr === "scale";

            if (!spring) {
              var currVal = isTransform ? val : parseFloat(el.attr(attr), 10) || 0;
              spring = new Wobble.Spring({
                damping: 15,
                fromValue: currVal,
                toValue: currVal,
              });
              if (isTransform) {
                spring.onUpdate(() => {
                  if (enable) {
                    el.attr("transform", constructTransform(attrSprings));
                  } else {
                    el.attr("transform", null);
                  }
                });
              } else {
                spring.onUpdate(s => {
                  if (enable) {
                    el.attr(attr, s.currentValue);
                  } else {
                    el.attr(attr, "initial");
                  }
                });
              }
              attrSprings[attr] = spring;
            }

            list.push(() => {
              spring.updateConfig({toValue: val});
              spring.start();
            });
          });
        }
      });
  });

  $("[data-class-on-enter]").each(function() {
    var el = $(this);
    el.data("class-on-enter")
      .split(" ")
      .forEach(part => {
        var m = part.match(/(\w+):([+\-*])([\w-]+)/);
        if (m) {
          var list = (enterListeners[m[1]] = enterListeners[m[1]] || []);
          list.push(() => {
            if (m[2] === "+") {
              el.addClass(m[3]);
            } else if (m[2] === "-") {
              el.removeClass(m[3]);
            }
          });
        }
      });
  });

  $("[data-class-on-leave]").each(function() {
    var el = $(this);
    el.data("class-on-leave")
      .split(",")
      .forEach(part => {
        var m = part.match(/(\w+):([+-])([\w-]+)/);
        if (m) {
          var list = (leaveListeners[m[1]] = leaveListeners[m[1]] || []);
          list.push(() => el[m[2] === "-" ? "removeClass" : "addClass"](m[3]));
        }
      });
  });

  function handleResize() {
    spyDimensions = [];
    $("[data-visible-key]").each(function() {
      var el = $(this);
      var top = el.offset().top;
      var spyInfo = {
        isActive: false,
        key: el.data("visible-key"),
        top: top,
        bottom: top + el.outerHeight(),
      };
      spyDimensions.push(spyInfo);
    });
    mediaQueriesChecker.forEach(checkerFn => checkerFn());
  }

  function checkIfActive() {
    var scrollEnterPos = window.scrollY + window.innerHeight * 0.75;
    var scrollLeavePos = window.scrollY + window.innerHeight * 0.25;
    spyDimensions.forEach(dim => {
      var nextActive = scrollLeavePos >= dim.top && scrollEnterPos <= dim.bottom;
      if (nextActive !== dim.isActive) {
        dim.isActive = nextActive;
        if (nextActive && enterListeners[dim.key]) {
          enterListeners[dim.key].forEach(fn => fn());
        }
        if (!nextActive && leaveListeners[dim.key]) {
          leaveListeners[dim.key].forEach(fn => fn());
        }
      }
    });
  }

  $(window).on("resize", handleResize);
  $(window).on("scroll", checkIfActive);
  handleResize();
  checkIfActive();
}

function toggleButton() {
  $("[data-toggle]").each(function() {
    var el = $(this);
    var hasHidden = el.children(".hidden").length > 0;
    var style = el.data("toggle-style") || "fade";
    el.on("click", function() {
      $(el.data("toggle"))[style + "Toggle"](250);
      if (hasHidden) el.children().toggleClass("hidden");
    });
  });
}

function headerScroll() {
  var el = $(".main-header,#mobile-nav");
  var windowHeight = $(window).innerHeight() * 0.8;
  var handleScroll = () => {
    if (window.scrollY < windowHeight - 30) {
      el.removeClass("is-scrolled-a-page");
    } else if (window.scrollY > windowHeight) {
      el.addClass("is-scrolled-a-page");
    }
  }
  $(window).on("scroll", handleScroll);
  handleScroll();
}

function setupActiveSnapping() {
  var spyDimensions = [];
  var isActive = false;

  function measure() {
    spyDimensions = [];
    $("[data-active-snapping]").each(function() {
      var el = $(this);
      var top = el.offset().top;
      var bottom = top + el.outerHeight();
      var spyInfo = {
        top: top,
        bottom: bottom,
      };
      spyDimensions.push(spyInfo);
    });
  }

  function findIfActive() {
    var scrollEnterPos = window.scrollY + window.innerHeight * 0.75;
    var scrollLeavePos = window.scrollY + window.innerHeight * 0.66;
    var someActive = spyDimensions.some(
      spy => scrollLeavePos >= spy.top && scrollEnterPos <= spy.bottom
    );
    if (someActive) {
      if (!isActive) {
        $("body").css({scrollSnapType: "y mandatory"});
        isActive = true;
      }
    } else {
      if (isActive) {
        $("body").css({scrollSnapType: "none"});
        isActive = false;
      }
    }
  }

  $(window).on("resize", measure);
  $(window).on("scroll", findIfActive);
  measure();
  findIfActive();
}

// This function is being called by the google-maps script
function initMap() {
  var styles = [
    {elementType: "geometry", stylers: [{color: "#f5f5f5"}]},
    {elementType: "labels.icon", stylers: [{visibility: "off"}]},
    {elementType: "labels.text.fill", stylers: [{color: "#616161"}]},
    {elementType: "labels.text.stroke", stylers: [{color: "#f5f5f5"}]},
    {
      featureType: "administrative.land_parcel",
      elementType: "labels.text.fill",
      stylers: [{color: "#bdbdbd"}],
    },
    {featureType: "poi", elementType: "geometry", stylers: [{color: "#eeeeee"}]},
    {featureType: "poi", elementType: "labels.text.fill", stylers: [{color: "#757575"}]},
    {featureType: "poi.park", elementType: "geometry", stylers: [{color: "#e5e5e5"}]},
    {featureType: "poi.park", elementType: "labels.text.fill", stylers: [{color: "#9e9e9e"}]},
    {featureType: "road", elementType: "geometry", stylers: [{color: "#ffffff"}]},
    {featureType: "road.arterial", elementType: "labels.text.fill", stylers: [{color: "#757575"}]},
    {featureType: "road.highway", elementType: "geometry", stylers: [{color: "#fff"}]},
    {featureType: "road.highway", elementType: "labels.text.fill", stylers: [{color: "#616161"}]},
    {featureType: "road.local", elementType: "labels.text.fill", stylers: [{color: "#9e9e9e"}]},
    {featureType: "transit.line", elementType: "geometry", stylers: [{color: "#e5e5e5"}]},
    {featureType: "transit.station", elementType: "geometry", stylers: [{color: "#eeeeee"}]},
    {featureType: "water", elementType: "geometry", stylers: [{color: "#c9c9c9"}]},
    {featureType: "water", elementType: "geometry.fill", stylers: [{color: "#009fe3"}]},
    {featureType: "water", elementType: "labels.text.fill", stylers: [{color: "#9e9e9e"}]},
  ];
  var map = new google.maps.Map(document.getElementById("map"), {
    zoom: 6,
    center: {lat: 48.77 + (52.5 - 48.77) / 2, lng: 9.17 + (13.12 - 9.17) / 2},
    styles,
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: false,
  });

  var image = {
    url: "/assets/images/icon_d-labs.svg",
    scaledSize: new google.maps.Size(25, 25)
  };

  // Potsdam
  new google.maps.Marker({
    position: {lat: 52.3902283, lng: 13.1149736},
    map: map,
    icon: image,
  });

  // Stuttgart
  new google.maps.Marker({
    position: {lat: 48.7765607, lng: 9.1745821},
    map: map,
    icon: image,
  });

  // Berlin
  new google.maps.Marker({
    position: {lat: 52.5051579, lng: 13.4620999},
    map: map,
    icon: image,
  });
}

function approachAnimation() {
  var circle = $("#approach-circle");
  if (!circle.length) return;
  var hasFired = false;
  function fire() {
    if (hasFired) return;
    $(document).off("mousemove", fire);
    $(window).off("scroll", fire);
    hasFired = true;
    circle.addClass("is-big");
    $("body").addClass("with-blue-header");
    $("[data-after-approach-animate]").each(function() {
      var el = $(this);
      el.data("after-approach-animate")
        .split(/\s+/g)
        .forEach(part => {
          var match = part.match(/([+\-])([\w-]+)/);
          if (match) {
            if (match[1] === "-") {
              el.removeClass(match[2]);
            } else {
              el.addClass(match[2]);
            }
          }
        });
    });
  }
  setTimeout(fire, 5000);
  $(document).on("mousemove", fire);
  $(window).on("scroll", fire);
}

function setupCarousel() {
  var indicators = $("[data-carousel-indicators]");

  $(".carousel")
    .slick({
      dots: true,
      arrows: true,
      prevArrow:
        '<div class="absolute inset-y right-100 col justify-center px-1"><button type="button" class="button-text"><img src="/assets/images/icons/icon-swipe-left.svg" alt="Previous" class="height-4" style="max-width: initial"/></button></div>',
      nextArrow:
        '<div class="absolute inset-y left-100 col justify-center px-1"><button type="button" class="button-text"><img src="/assets/images/icons/icon-swipe-right.svg" alt="Next" class="height-4" style="max-width: initial"/></button></div>',
    })
    .on("afterChange", (slick, slide) => {
      indicators.children().removeClass("is-active");
      indicators.children(":eq(" + slide.currentSlide + ")").addClass("is-active");
    });
}

function setupMethodFilter() {
  var activeFilters = [];
  var buttons = {};
  var tiles = [];
  $("[data-services-filter]").each(function() {
    var button = $(this);
    var filter = button.data("services-filter");
    buttons[filter] = button;
    button.on("click", () => {
      if (filter === "all") {
        activeFilters = [];
      } else if (activeFilters.indexOf(filter) >= 0) {
        activeFilters = activeFilters.filter(f => f !== filter);
      } else {
        activeFilters = [filter]
      }
      sync();
    });
  });

  $("[data-method-tile]").each(function() {
    var tile = $(this);
    var domainKeys = tile
      .data("method-tile")
      .split(",")
      .filter(Boolean);
    var domains = {};
    domainKeys.forEach(key => (domains[key] = true));
    tiles.push({el: tile, domains: domains});
  });

  function sync() {
    $("[data-services-filter]").removeClass("is-active");
    if (activeFilters.length === 0) {
      buttons.all.addClass("is-active");
      tiles.forEach(tile => tile.el.removeClass("hidden"));
    } else {
      tiles.forEach(tile => tile.el.addClass("hidden"));
      activeFilters.forEach(f => {
        buttons[f].addClass("is-active");
        tiles.forEach(tile => {
          if (tile.domains[f]) tile.el.removeClass("hidden");
        });
      });
    }
  }
}

$(function() {
  setupScrollSpy();
  toggleButton();
  headerScroll();
  setupActiveSnapping();
  approachAnimation();
  setupCarousel();
  setupMethodFilter();
  var ua = window.navigator.userAgent;
  if (ua.indexOf("MSIE ") > 0 || !!ua.match(/Trident.*rv\:11\./)) $("body").addClass("is-ie");
});
