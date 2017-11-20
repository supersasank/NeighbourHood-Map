var map = {};
var infoWindow;
var currentInfoWindow = false;
var currentMarker = null;
var coffeeShops = [];

const clientId = 'GSEJNOVXCZXLRPYYKHKRSSX2GKISSPXBE1PNWVCCURAQIBGP';
const clientSecret = 'CPDYJKADUJVGJIOTSFV0CKOVMKP3KNSGT5HTUYLKK12SWS1E';

function getCoffeeShops() {
  $.get(
    `https://api.foursquare.com/v2/venues/search?client_id=${clientId}&client_secret=${clientSecret}&v=20170801&near=hyderabad&query=coffee&limit=20`
  )
    .then(function(data) {
      var promises = data.response.venues.map(venu => {
        return $.get(
          `https://api.foursquare.com/v2/venues/${venu.id}?client_id=${clientId}&client_secret=${clientSecret}&v=20170801`
        );
      });
      return Promise.all(promises);
    })
    .then(function(data) {
      vm.isLoading(false);
      coffeeShops = data.map(item => {
        return item.response.venue;
      });
      console.log(coffeeShops);
      var bounds = new google.maps.LatLngBounds();
      //Responsive map for resize browser window
      google.maps.event.addDomListener(window, 'resize', function() {
        map.fitBounds(bounds);
      });
      coffeeShops.forEach(element => {
        vm.coffeeShops.push(new mapMarker(element));
      });
      vm.coffeeShops().forEach(function(business) {
        bounds.extend(business.marker.position);
      });
    })
    .catch(function(err) {
      vm.isLoading(false);
      vm.error(
        err.message || 'Failed to load shops due to something bad happened with API requests(Check browsers console)'
      );
    });
}

function mapMarker(data) {
  const self = this;
  self.name = ko.observable(data.name);
  const shopName = `${data.name}(${data.location.crossStreet || data.location.address || data.location.country})`;
  self.shopName = ko.observable(shopName);
  self.lat = data.location.lat;
  self.lng = data.location.lng;
  var icon = data.bestPhoto;
  var img = icon ? `${icon.prefix}100x100${icon.suffix}` : 'https://placehold.it/100/100';
  self.marker = new google.maps.Marker({
    title: self.name(),
    position: new google.maps.LatLng(self.lat, self.lng),
    map: map,
    animation: google.maps.Animation.DROP,
  });
  self.reCenterMap = function() {
    map.panTo(new google.maps.LatLng(self.lat, self.lng));
  };
  self.bounceMarker = function() {
    self.marker.setAnimation(google.maps.Animation.BOUNCE);
    setTimeout(function() {
      self.marker.setAnimation(null);
    }, 1500);
  };
  self.openInfoWindow = function() {
    self.reCenterMap();
    infoWindow.open(map, self.marker);
    infoWindow.setContent(`
      <div class="content">
        <h3>${self.name()}</h3>
        <div class="img">
          <img src='${img}' alt='${data.name}'/>
          <p>
            ${data.description || data.location.formattedAddress.join()}
          </p>
        </div>
        <div class="details">
          <ul>
            <li><strong>Likes</strong>: ${data.likes.count || 'N/A'}</li>
            <li><strong>Rating</strong>: ${data.rating || 'N/A'}</li>
            <li><strong>KnowMore</strong>: <a target="_blank" href="${data.canonicalUrl}">${data.canonicalUrl}</a></li>
          </ul>
        </div>
      </div>
    `);
  };
  self.switchInfoWindow = function() {
    if (currentInfoWindow) {
      currentInfoWindow.close();
    }
    currentInfoWindow = infoWindow;
    currentMarker = self.marker;
    self.openInfoWindow();
  };
  self.closeInfoWindowOnMapClick = function() {
    google.maps.event.addListener(map, 'click', function() {
      infoWindow.close();
    });
  };
  self.showMarkerInteraction = function() {
    self.openInfoWindow();
    self.bounceMarker();
    self.switchInfoWindow();
    self.closeInfoWindowOnMapClick();
  };
  self.marker.addListener('click', function() {
    self.showMarkerInteraction();
  });
  self.isMarkerVisible = ko.observable(false);
  self.isMarkerVisible.subscribe(function(currentState) {
    if (currentState) {
      self.marker.setMap(map);
    } else {
      self.marker.setMap(null);
    }
  });
  //set default state to true
  self.isMarkerVisible(true);
}

function ViewModel() {
  const self = this;
  self.error = ko.observable('');
  self.isLoading = ko.observable(true);
  self.coffeeShops = ko.observableArray([]);
  getCoffeeShops(self.coffeeShops, self.isLoading);
  self.searchQuery = ko.observable('');
  self.filteredShops = ko.computed(function() {
    return ko.utils.arrayFilter(self.coffeeShops(), function(shop) {
      var matchedShop =
        shop
          .name()
          .toLowerCase()
          .indexOf(self.searchQuery()) >= 0;
      shop.isMarkerVisible(matchedShop);

      return matchedShop;
    });
  });
  self.clickedShop = ko.observable();
  self.selectedShop = function(click) {
    self.clickedShop(click);
    if (click != null) {
      self.clickedShop().showMarkerInteraction();
    }
  };
}

var vm = new ViewModel();
ko.applyBindings(vm);

window.onMapError = function() {
  alert('Google Maps has failed to load. Please check your internet connection and try again.');
};

window.initializeMap = function() {
  map = new google.maps.Map(document.querySelector('#map'), {
    zoom: 12,
    center: new google.maps.LatLng({
      lat: 17.38405,
      lng: 78.45636,
    }),
  });
  infoWindow = new google.maps.InfoWindow();
};
