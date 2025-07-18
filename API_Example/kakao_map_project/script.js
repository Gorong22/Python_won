const url =
  "https://apis.data.go.kr/B551011/GoCamping/basedList?numOfRows=4000&pageNo=1&MobileOS=ETC&MobileApp=camnavi&serviceKey=vXpamPPqXWsORdlj04YF6P%2FII0iMXCy2cV5WrUe78yyyLIH3JSQ5Fl82BQb0YzAJwwhceO%2Bxn%2Fae1OvcA7pXmg%3D%3D&_type=json";

fetch(url)
  .then((response) => response.json())
  .then((result) => {
    const data = result.response.body.items.item;
    console.log(data);

    const showPosition = (position) => {
      const { latitude, longitude } = position.coords;
      console.log(latitude, longitude);

      const container = document.getElementById("map");

      var options = {
        //지도를 생성할 때 필요한 기본 옵션
        center: new kakao.maps.LatLng(latitude, longitude), //지도의 중심좌표.
        level: 3, //지도의 레벨(확대, 축소 정도)
      };

      var map = new kakao.maps.Map(container, options);

      var clusterer = new kakao.maps.MarkerClusterer({
        map: map,
        averageCenter: true,
        minLevel: 10,
      });

      let markers = [];

      for (var i = 0; i < data.length; i++) {
        var marker = new kakao.maps.Marker({
          map: map,
          position: new kakao.maps.LatLng(data[i].mapY, data[i].mapX),
        });

        markers.push(marker);

        var infowindow = new kakao.maps.InfoWindow({
          content: data[i].facltNm,
        });

        function makeOverListener(map, marker, infowindow) {
          return function () {
            infowindow.open(map, marker);
          };
        }
        function makeOutListener(infowindow) {
          return function () {
            infowindow.close();
          };
        }

        kakao.maps.event.addListener(
          marker,
          "mouseover",
          makeOverListener(map, marker, infowindow)
        );

        kakao.maps.event.addListener(
          marker,
          "mouseout",
          makeOutListener(map, marker, infowindow)
        );
      }

      clusterer.addMarkers(markers);
    };

    const errorPosition = (error) => {
      alert(error.message);
    };

    window.navigator.geolocation.getCurrentPosition(
      showPosition,
      errorPosition
    );
  });
