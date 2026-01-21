
    mapboxgl.accessToken = mapToken;
    const map = new mapboxgl.Map({
        container: 'map', // container ID
        center: allData.geometry.coordinates, // starting position [lng, lat]. Note that lat must be set between -90 and 90
        zoom: 10// starting zoom
    });   
    const Marker = new mapboxgl.Marker({color:'red'})
    .setLngLat(allData.geometry.coordinates)
    .setPopup(
     new mapboxgl.Popup({offset: 45})
   
    .setHTML(`<h4>it me</h4><P> sagar</P`)
    .setMaxWidth("300px")
    )
    .addTo(map);


