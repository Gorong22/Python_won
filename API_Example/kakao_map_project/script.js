const url =
  "https://apis.data.go.kr/B551011/GoCamping/basedList?numOfRows=4000&pageNo=1&MobileOS=ETC&MobileApp=camnavi&serviceKey=vXpamPPqXWsORdlj04YF6P%2FII0iMXCy2cV5WrUe78yyyLIH3JSQ5Fl82BQb0YzAJwwhceO%2Bxn%2Fae1OvcA7pXmg%3D%3D&_type=json";

fetch(url)
  .then((response) => response.json())
  .then((result) => {
    const data = result.response.body.items.item;
    const errorPosition = (error) => {
      alert(error.message);
    };
    const showPosition = (position) => {
      const { latitude, longitude } = position.coords;

      const container = document.getElementById("map");
    };
    window.navigator.geolocation.getCurrentPosition(
      showPosition,
      errorPosition
    );
  });
