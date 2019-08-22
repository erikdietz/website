//= require vendor/jquery-3.4.1.min.js
//= require vendor/wobble.browser.min.js

function init() {
  $("[data-init-class]").each(function() {
    var el = $(this);
    el.addClass(el.data("init-class"));
  });
}

function setupScrollSpy() {
  var spyDimensions = [];
  var enterListeners = {};
  var leaveListeners = {};

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

  $("[data-attr-on-enter]").each(function() {
    var el = $(this);
    var attrSprings = {};
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
            var isTranslate = attr.indexOf("translate") === 0;

            if (!spring) {
              var currVal = isTranslate ? val : parseFloat(el.attr(attr), 10) || 0;
              spring = new Wobble.Spring({
                damping: 15,
                fromValue: currVal,
                toValue: currVal,
              });
              if (isTranslate) {
                spring.onUpdate(() =>
                  el.attr(
                    "transform",
                    "translate(" +
                      attrSprings.translateX.currentValue +
                      " " +
                      attrSprings.translateY.currentValue +
                      ")"
                  )
                );
              } else {
                spring.onUpdate(s => el.attr(attr, s.currentValue));
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

  function measureSpies() {
    spyDimensions = [];
    var scrollEnterPos = window.scrollY + window.innerHeight * 0.75;
    var scrollLeavePos = window.scrollY + window.innerHeight * 0.25;
    $("[data-visible-key]").each(function() {
      var el = $(this);
      var top = el.offset().top;
      var bottom = top + el.outerHeight();
      var spyInfo = {
        isActive: scrollLeavePos >= top && scrollEnterPos <= bottom,
        key: el.data("visible-key"),
        top: top,
        bottom: bottom,
      };
      spyDimensions.push(spyInfo);
      if (spyInfo.isActive && enterListeners[spyInfo.key]) {
        enterListeners[spyInfo.key].forEach(fn => fn());
      }
    });
  }

  measureSpies();
  $(window).on("resize", measureSpies);
  $(window).on("scroll", e => {
    var scrollEnterPos = window.scrollY + window.innerHeight;
    var scrollLeavePos = window.scrollY + window.innerHeight;
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
  });
}

function toggleButton() {
  $("[data-toggle]").each(function() {
    var el = $(this);
    var style = el.data("toggle-style") || "fade";
    el.on("click", function() {
      $(el.data("toggle"))[style + "Toggle"](250);
    });
  });
}

function headerScroll() {
  var el = $(".main-header");
  $(window).on("scroll", () => {
    if (window.scrollY < 20) {
      el.removeClass("is-scrolled");
    } else if (window.scrollY > 50) {
      el.addClass("is-scrolled");
    }
  });
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
  var position = {lat: 52.3902316, lng: 13.1149683};
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
    zoom: 12,
    center: position,
    styles,
  });
  new google.maps.Marker({
    position: position,
    map: map,
  });
}

$(function() {
  init();
  setupScrollSpy();
  toggleButton();
  headerScroll();
  setupActiveSnapping();
  var ua = window.navigator.userAgent;
  if (ua.indexOf("MSIE ") > 0 || !!ua.match(/Trident.*rv\:11\./)) $("body").addClass("is-ie");
});
