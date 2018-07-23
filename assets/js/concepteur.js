var globalPoly;
var poly;

var pathArray = [];

var map;
var geoPos;

var markerVide = "{{ asset('images/empty.png') }}";   //pour ne pas avoir de marqueur pour chaque point (à ameliorer)

var firstPoint;    //premier point à qui l'on donnera un skin différent (marqueur vert)
var lastPoint;    //dernier point à avoir été placé (dernieres coords, pas dernier marqueur)
var marker;
var markers = [];    //array contenant l'ensemble des marqueurs
var firstMarker;   //premier marqueur (à ne pas confondre avec firstPoint qui contient les coords de notre premier point)
var distanceKmFloat;     //distance en km
var distanceArrondie;

var vitesseVelo = 20;
var vitesseFooting = 12;
var vitesseMarche = 6;



function initMap() {

    var mapDiv = document.getElementById("map");
    //je récupére mon element avec l'id map
    var windowHeight = window.innerHeight;
    //je prend la hauteur de la fenêtre
    var tailleNb = windowHeight - 80;
    var tailleVoulu = tailleNb + 'px';
    //je calcule pour que ma map fasse hauteur de la fenêtre moins le header
    mapDiv.style.height = tailleVoulu;
    //c'est comme si je fais en CSS: 'height: tailleVoulu;'

    //definir taille du menu gauche
    var menuGauche = document.getElementById('menuGauche');
    menuGauche.style.height = tailleVoulu;

    var saveContainer = document.getElementById('saveContainer');
    saveContainer.style.height = tailleVoulu;

    /*var formPopUp = document.getElementById('formPopUp');
    formPopUp.style.height = (tailleNb - 100) + 'px';*/



    //on veut centrer la carte sur notre position si la geolocalisation est activée
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position){   //recupère notre position
            geoPos = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };

            map.setCenter(geoPos);   //centre la carte

        });
    } else {
        // Le navigateur ne supporte pas la géolocalisation ou elle a été refusé
        alert('Votre naviguateur ne supporte pas la géolocalisation ou un problème est survenu');
    }

    map = new google.maps.Map(document.getElementById('map'), {    //recupére la div #map et la transforme en objet map, stocké dans la var map
        zoom: 14,   //Définie le zoom par défaut
        draggableCursor: "crosshair",   //on a une croix comme curseur
        mapTypeId: 'hybrid',
        center: {lat: 49.3904707, lng: 3.3929198}
    });

    var mapType = map.getMapTypeId();
    var polyColor;
    var textDiv = document.getElementById('textDiv');

    if (mapType == 'hybrid'){
        polyColor = "#35f700";
        textDiv.style.color = "#fff";
    } else {
        polyColor = "#3BA14C";
        textDiv.style.color = "#000";
    }

    globalPoly = new google.maps.Polyline({   //créé déjà la polyline
        strokeColor:  polyColor,
        strokeOpacity: 1.0,
        strokeWeight: 3
    });
    globalPoly.setMap(map);   //on attache l'objet polyline à notre map

    poly = new google.maps.Polyline({   //créé déjà la polyline
        strokeColor: polyColor,
        strokeOpacity: 1.0,
        strokeWeight: 3
    });

    //listeners qui vont écouter les événements click et rightcick pour y lancer des fonctions
    map.addListener('click', addLatLng);     //quand on clique sur un endroit de la carte on lance la fonction addLatLng
    map.addListener('rightclick', addLatLngRoute);    //quand on clique droit sur un endroit on lance la fonction addLatLngRoute



    //Ici, on va transformer nos champs HTML (que l'on va recupérer avec getElementById) en "contrôles" de la map. Pour l'API, un contrôle est par exemple le bouton plein écran en haut à droite. C'est le seul moyen potable de faire passer des boutons sur une carte.

    var input = document.getElementById('pac-input');
    var searchBox = new google.maps.places.SearchBox(input);   //on définit que notre input est une search box (qui va nous permettre de rentrer notre localisation avec l'autocomplétion)
    map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);   //ce contrôle se positionnera en haut à gauche


    var deleteAllButton = document.getElementById('deleteAllButton');
    map.controls[google.maps.ControlPosition.BOTTOM].push(deleteAllButton);

    var deleteLastButton = document.getElementById('deleteLastButton');
    map.controls[google.maps.ControlPosition.BOTTOM].push(deleteLastButton);

    var closeLoopButton = document.getElementById('closeLoopButton');
    map.controls[google.maps.ControlPosition.BOTTOM].push(closeLoopButton);


    var centerMap = document.getElementById('centerMap');
    map.controls[google.maps.ControlPosition.TOP_LEFT].push(centerMap);


    var selectModeSuivi = document.getElementById('selectModeSuivi');
    map.controls[google.maps.ControlPosition.TOP_LEFT].push(selectModeSuivi);

    var savePath = document.getElementById('savePath');
    map.controls[google.maps.ControlPosition.RIGHT].push(savePath);

    var boutonMenuLateral = document.getElementById('boutonMenuLateral');
    map.controls[google.maps.ControlPosition.LEFT].push(boutonMenuLateral);




    //toute cette dernière section se rapporte à la searchbox (localisation)

    map.addListener('bounds_changed', function() {
        searchBox.setBounds(map.getBounds());
    });

    searchBox.addListener('places_changed', function() {
        var places = searchBox.getPlaces();

        if (places.length === 0) {
            return;
        }

        var bounds = new google.maps.LatLngBounds();

        places.forEach(function(place) {
            if (!place.geometry) {
                console.log("Le lieu ne retourne rien");
                return;
            }

            if (place.geometry.viewport) {
                bounds.union(place.geometry.viewport);
            } else {
                bounds.extend(place.geometry.location);
            }
        });

        map.fitBounds(bounds);
    });

    google.maps.event.addListener( map, 'maptypeid_changed', function(){
        var mapType = map.getMapTypeId();

        if (mapType == 'hybrid'){
            globalPoly.setOptions({strokeColor: '#35f700'});
            firstMarker.setOptions({icon: "{{ asset('images/marker_hybrid.png') }}"});
            textDiv.style.color = "#fff";
        } else {
            globalPoly.setOptions({strokeColor: '#3BA14C'});
            firstMarker.setOptions({icon: "{{ asset('images/marker.png') }}"});
            textDiv.style.color = "#000";
        }
    });
}
/************* FIN INITMAP *************/








// Fonction qui sera executée lors du clique d'un endroit de la carte
function addLatLng(event) {
    var monPath = globalPoly.getPath();   //on récupére le parcours (si ce n'est pas le premier point)

    monPath.push(event.latLng);


    var markerStart;
    var mapType = map.getMapTypeId();

    if (mapType == 'hybrid'){
        markerStart = "{{ asset('images/marker_hybrid.png') }}";
    } else {
        markerStart = "{{ asset('images/marker.png') }}";
    }


    //Si c'est le premier marqueur on lui donne l'icone image sinon on laisse un marqeur normale
    if (monPath.getLength() === 1) {
        marker = new google.maps.Marker({
            position: event.latLng,
            map: map,
            icon: markerStart          //le marqueur aura notre image de drapeau
        });

        firstPoint = event.latLng;

        lastPoint = event.latLng;

        firstMarker = marker;
    }
    else{     //sinon cela veut dire que ce n'est pas le premier marqueur et on ne lui donne pas de skin (empty.png)
        marker = new google.maps.Marker({
            position: event.latLng,
            map: map,
            icon: markerVide
        });

        markers.push(marker);   //on met notre tout nouveau marker dans le tableau markers

        lastPoint = event.latLng;

        pathArray = monPath.getArray();

        var distance = google.maps.geometry.spherical.computeLength(pathArray);   //calcule la distance du parcours en comptant tout les points
        distanceArrondie = Math.round(distance);    //arrondi la distance à l'unité près
        distanceKmFloat = distanceArrondie/1000;
    }

    var div = document.getElementById("textDiv");    //recupere la div textDiv
    if ((distanceArrondie == undefined) || (distanceArrondie == 0)){   //si aucun parcours n'est présent ou s'il n'y a qu'un marqueur
        div.textContent = "Vous n'avez placé qu'un seul marqueur"
    } else {
        div.textContent = "Il y a " + distanceKmFloat + " kilomètres entre le premier et le dernier point" ;
        //on affiche la distance arrondie et au km dans la div textDiv
        div.title = "Ou " + distanceArrondie + " mètres";

        var menuGaucheInterieur = document.getElementById("menuGauche-interieur");
        menuGaucheInterieur.style.display = "block";

        var menuGaucheMessage = document.getElementById("menuGauche-message");
        menuGaucheMessage.style.display = "none";

        var formPopUp = document.getElementById("formPopUp");
        formPopUp.style.display = "block";

        var saveMessage = document.getElementById("save-message");
        saveMessage.style.display = "none";
    }

    updateTempsGlobal(distanceKmFloat);
}
/************* FIN ADDLATLNG *************/













var directionsService;

function calculateRoute(directionsService, lastPoint, newPoint) {

    var monPath = globalPoly.getPath();

    var directionsService = new google.maps.DirectionsService();

    var selectModeSuivi = document.getElementById('selectModeSuivi');

    var travelMode = selectModeSuivi.options[selectModeSuivi.selectedIndex].value;   //ici on met que le mode de transport est la marche mais in pourra plus tard laisser à l'utilisateur de choisir le mode
    var request = {
        origin: lastPoint,
        destination: newPoint,
        travelMode: google.maps.TravelMode[travelMode]
    };

    directionsService.route(request, function(response, status) {
            if (status == 'OK') {                              //s'il n'y a aucun problème avec l'itinéraire
                var pointsArray = response.routes[0].overview_path;

                for (var i = 0; i < pointsArray.length; i++) {
                    monPath.push(pointsArray[i]);
                }

                updateRouteLength();
            } else {
                alert("Il n'y a pas de chemin pour aller à cet endroit");
            }
        }
    )
}
/************* FIN CALCULROUTE *************/





//lorsque l'on right click sur un endroit on va ralier le dernier point créé à ce tout nouveau point mais en affichant l'itinéraire en passant par la route ou les chemins (pas en créant une ligne droite)
function addLatLngRoute(event){

    newPoint = event.latLng;   // Coords du point qui vient d'etre rightclické

    calculateRoute(directionsService, lastPoint, newPoint);  //fonction qui calcule et affiche l'itinéraire

    var monPath = globalPoly.getPath();

    marker = new google.maps.Marker({
        position: event.latLng,
        map: map,
        icon: markerVide
    });

    poly.setMap(map);  //on affiche la polyline sur la map

    markers.push(marker);   //on met notre tout nouveau marker dans le tableau markers

    lastPoint = event.latLng;
}
/************* FIN ADDLATLNGROUTE *************/










//met à jour la zone de texte en bas de la carte qui donne la distance du parcours
function updateRouteLength(){

    var monPath = globalPoly.getPath();

    pathArray = monPath.getArray();

    var distance = google.maps.geometry.spherical.computeLength(pathArray);   //calcule la distance du parcours en comptant tout les points
    distanceArrondie = Math.round(distance);    //arrondi la distance à l'unité près
    distanceKmFloat = distanceArrondie/1000;


    var div = document.getElementById("textDiv");    //recupere la div textDiv
    if ((distanceArrondie == undefined) || (distanceArrondie == 0)){   //si aucun parcours n'est présent ou s'il n'y a qu'un marqueur
        div.textContent = "Vous n'avez placé qu'un seul marqueur";
    } else {
        div.textContent = "Il y a " + distanceKmFloat + " kilomètres entre le premier et le dernier point" ;
        //on affiche la distance arrondie et au km dans la div textDiv
        div.title = "Ou " + distanceArrondie + " mètres";

        var menuGaucheInterieur = document.getElementById("menuGauche-interieur");
        menuGaucheInterieur.style.display = "block";

        var menuGaucheMessage = document.getElementById("menuGauche-message");
        menuGaucheMessage.style.display = "none";

        var formPopUp = document.getElementById("formPopUp");
        formPopUp.style.display = "block";

        var saveMessage = document.getElementById("save-message");
        saveMessage.style.display = "none";
    }

    updateTempsGlobal(distanceKmFloat);
}
/************* FIN UPDATEROUTELENGTH *************/








//return 23 si on lui passe x.23
function getDecimal(n) {
    return (n - Math.floor(n));
}

function getPartieDecimale(n){
    return (Math.round((Math.round(100 * getDecimal(n))/100) * 100 * 60 / 100));
}

function updateTempsGlobal(distanceKmFloat){
    //velo
    updateTempsNecessaire(distanceKmFloat, vitesseVelo, "tempsVelo");

    //footing
    updateTempsNecessaire(distanceKmFloat, vitesseFooting, "tempsFooting");

    //marche
    updateTempsNecessaire(distanceKmFloat, vitesseMarche, "tempsMarche");
}

function updateTempsNecessaire(distanceKmFloat, vitesseMoyenne, sport){
    var tempsHTML = document.getElementById(sport); //on récup l'élément p tempsVelo

    var temps = distanceKmFloat / vitesseMoyenne; // t = d / v      on sort le temps qu'il faut en heures (mais on a 1.5 heures au lieu de 1h30)
    var tempsEnMinutesAvecSecondes = Math.round(100 * (temps * 60))/100;  //on sort 52.31 (52 minutes 31 secondes)
    var secondesTemps = getPartieDecimale(tempsEnMinutesAvecSecondes);

    var tempsEnMinutes = Math.round(tempsEnMinutesAvecSecondes);   //on sort juste 52

    if(tempsEnMinutes === 1){
        var minuteOrthographe = " minute";
    }else{
        var minuteOrthographe = " minutes";
    }

    if(secondesTemps === 1){
        var secondeOrthographe = " seconde";
    }else{
        var secondeOrthographe = " secondes";
    }


    if(tempsEnMinutes < 1){
        tempsHTML.textContent = secondesTemps + secondeOrthographe;
        tempsHTML.title = "";
    }else{
        //si il y a plus de 60 minutes on affiche en heures et minutes
        if(tempsEnMinutes < 60){
            tempsHTML.textContent = tempsEnMinutes + minuteOrthographe;
            tempsHTML.title = "Et " + secondesTemps + secondeOrthographe;
        }else{
            var tempsEnHeuresFloat = tempsEnMinutes / 60;
            var minutesDuTempsPourHeures = getPartieDecimale(tempsEnHeuresFloat); //on recup les minutes
            var tempsEnHeures = Math.round(tempsEnHeuresFloat);

            if(minutesDuTempsPourHeures === 1){
                var minuteOrthographe = " minute";
            }else{
                var minuteOrthographe = " minutes";
            }

            if(tempsEnHeures === 1){
                var heureOrthographe = " heure";
            }else{
                var heureOrthographe = " heures";
            }

            tempsHTML.textContent = tempsEnHeures + heureOrthographe + " et " + minutesDuTempsPourHeures + minuteOrthographe;  //on affiche
        }
    }

}
/************* FIN UPDATETEMPSNECESSAIRE *************/













var recup;

function dernierElem(tbl){
    var tbl = tbl;
    var tblLength = tbl.length;
    var pos = tblLength - 1;
    return tbl[pos];
}

//erreur avec erreur de geolocalisation
function handleLocationError(browserHasGeolocation, infoWindow, pos) {
    infoWindow.setPosition(pos);
    infoWindow.setContent(browserHasGeolocation ?
        'Erreur: Le service de Géolocalisation a echoué.' :
        'Erreur: Votre naviguateur ne support pas la Géolocalisation.');
}



//fonction qui va nous créer un setMap mais pour tous les marqueurs
function setMapOnAll(map) {
    for (var i = 0; i < markers.length; i++) {
        markers[i].setMap(map);
    }
}



//Fonctions des contrôles

$('#deleteLastButton').click(function() {
    var monPath = globalPoly.getPath();

    monPath.pop();   //on supprime le dernier élément du tableau path

    var pathArray = monPath.getArray();
    lastPoint = dernierElem(pathArray);

    var pathLength = monPath.getLength();

    if(pathLength === 0){
        deletePoints();
    }

    if(pathLength === 1){
        var menuGaucheInterieur = document.getElementById("menuGauche-interieur");
        menuGaucheInterieur.style.display = "none";

        var menuGaucheMessage = document.getElementById("menuGauche-message");
        menuGaucheMessage.style.display = "block";

        var formPopUp = document.getElementById("formPopUp");
        formPopUp.style.display = "block";

        var formFilter = document.getElementById("formFilter");
        formFilter.style.display = "block";

        var saveMessage = document.getElementById("save-message");
        saveMessage.style.display = "block";
    }

    updateRouteLength();

    updateTempsGlobal(distanceKmFloat);
});

$('#deleteAllButton').click(function() {
    firstMarker.setMap(null);
    setMapOnAll(null);
    markers = [];
    globalPoly.setMap(null);

    monPath = globalPoly.getPath();
    monPath = [];
    lastPoint = "";

    pathArray = [];

    var div = document.getElementById("textDiv");
    div.textContent = "Vous n'avez pas placé de marqueur";

    distanceArrondie = 0;
    distanceKmFloat = 0;

    var mapType = map.getMapTypeId();

    if (mapType == 'hybrid'){
        polyColor = "#35f700";
    } else {
        polyColor = "#3BA14C";
    }

    globalPoly = new google.maps.Polyline({   //on recréé une polyline pour que lorsque que l'on supprime l'ancienne on ne reparte pas sur l'ancienne
        strokeColor:  polyColor,
        strokeOpacity: 1.0,
        strokeWeight: 3
    });
    globalPoly.setMap(map);

    var menuGaucheInterieur = document.getElementById("menuGauche-interieur");
    menuGaucheInterieur.style.display = "none";

    var menuGaucheMessage = document.getElementById("menuGauche-message");
    menuGaucheMessage.style.display = "block";

    var formPopUp = document.getElementById("formPopUp");
    formPopUp.style.display = "block";

    var formFilter = document.getElementById("formFilter");
    formFilter.style.display = "block";

    var saveMessage = document.getElementById("save-message");
    saveMessage.style.display = "block";
});

$('#closeLoopButton').click(function() {
    calculateRoute(directionsService, lastPoint, firstPoint);
});

$('#centerMap').click(function() {
    map.setCenter(geoPos);
});




var menuGaucheBouton = document.getElementById('boutonMenuLateral');
var menuGauche = document.getElementById('menuGauche');
var mapFilter = document.getElementById('mapFilter');

menuGaucheBouton.onclick = function() {
    menuGauche.style.display = "block";
    mapFilter.style.display = "block";
};

$('#temps-necessaire-submit').click(function() {
    var inputTempsNecessaire = document.getElementById('temps-necessaire-input');
    var vitesseInput = inputTempsNecessaire.value;

    if(vitesseInput != '' && isNaN(vitesseInput) == false && vitesseInput <= 300){
        var tempsNecessaireDiv = document.getElementById('temps-necessaire-container');
        tempsNecessaireDiv.style.display = "none";
        var tempsNecessaireResultatDiv = document.getElementById('temps-necessaire-resultat-partie');
        tempsNecessaireResultatDiv.style.display = "block";

        var temps = distanceKmFloat / vitesseInput; // t = d / v      on sort le temps qu'il faut en heures (mais on a 1.5 heures au lieu de 1h30)
        var tempsEnMinutesAvecSecondes = Math.round(100 * (temps * 60))/100;
        var secondesTemps = getPartieDecimale(tempsEnMinutesAvecSecondes);
        var tempsEnMinutes = Math.round(tempsEnMinutesAvecSecondes);   //on sort juste 52

        var tempsNecessaireResultatAllureSpan = document.getElementById('temps-necessaire-resultat-allure');
        tempsNecessaireResultatAllureSpan.textContent = vitesseInput;
        var tempsNecessaireResultatSpan = document.getElementById('temps-necessaire-resultat-temps');

        if(tempsEnMinutes === 1){
            var minuteOrthographe = " minute";
        }else{
            var minuteOrthographe = " minutes";
        }

        if(secondesTemps === 1){
            var secondeOrthographe = " seconde";
        }else{
            var secondeOrthographe = " secondes";
        }


        if(tempsEnMinutes < 1){
            tempsNecessaireResultatSpan.textContent = secondesTemps + secondeOrthographe;
            tempsNecessaireResultatSpan.title = "";
        }else{
            //si il y a plus de 60 minutes on affiche en heures et minutes
            if(tempsEnMinutes < 60){
                tempsNecessaireResultatSpan.textContent = tempsEnMinutes + minuteOrthographe;
                tempsNecessaireResultatSpan.title = "Et " + secondesTemps + secondeOrthographe;
            }else{
                var tempsEnHeuresFloat = tempsEnMinutes / 60;
                var minutesDuTempsPourHeures = getPartieDecimale(tempsEnHeuresFloat); //on recup les minutes
                var tempsEnHeures = Math.round(tempsEnHeuresFloat);

                if(minutesDuTempsPourHeures === 1){
                    var minuteOrthographe = " minute";
                }else{
                    var minuteOrthographe = " minutes";
                }

                if(tempsEnHeures === 1){
                    var heureOrthographe = " heure";
                }else{
                    var heureOrthographe = " heures";
                }

                tempsNecessaireResultatSpan.textContent = tempsEnHeures + heureOrthographe + " et " + minutesDuTempsPourHeures + minuteOrthographe;  //on affiche
            }
        }
    }else{
        alert("Vous n'avez soit rien rentré, soit rentré quelque chose d'autre qu'un nombre, soit un nombre supérieur à 300");
    }
});

$('#temps-necessaire-resultat-btn').click(function() {
    displayDefaultInterfaceTempsNecessaire();
});

function displayDefaultInterfaceTempsNecessaire(){
    var tempsNecessaireDiv = document.getElementById('temps-necessaire-container');
    tempsNecessaireDiv.style.display = "block";
    var tempsNecessaireResultatDiv = document.getElementById('temps-necessaire-resultat-partie');
    tempsNecessaireResultatDiv.style.display = "none";
    var inputTempsNecessaire = document.getElementById('temps-necessaire-input');
    inputTempsNecessaire.value = "";
}




/****** tpvm = Temps pour vitesse moyenne ******/

$('#vitesse-moyenne-submit').click(function() {
    var tpvmHInput = document.getElementById("vitesse-moyenne-input-h");
    var tpvmMInput = document.getElementById("vitesse-moyenne-input-m");
    var tpvmSInput = document.getElementById("vitesse-moyenne-input-s");

    var tpvmH = tpvmHInput.value;
    var tpvmM = tpvmMInput.value;
    var tpvmS = tpvmSInput.value;

    if(tpvmH + tpvmM + tpvmS != '' && tpvmH + tpvmM + tpvmS != '0' && tpvmH + tpvmM + tpvmS != '00' && tpvmH + tpvmM + tpvmS != '000'){
        if(tpvmH <= 99){
            if(tpvmM <= 59){
                if(tpvmS <= 59){
                    var tpvmHInt;
                    var tpvmMInt;
                    var tpvmSInt;

                    if(tpvmH != ''){
                        tpvmHInt = parseInt(tpvmH, 10);
                    }else{
                        tpvmHInt = 0;
                    }
                    if(tpvmM != ''){
                        tpvmMInt = parseInt(tpvmM, 10);
                    }else{
                        tpvmMInt = 0;
                    }
                    if(tpvmS != ''){
                        tpvmSInt = parseInt(tpvmS, 10);
                    }else{
                        tpvmSInt = 0;
                    }

                    tpvmMInt = tpvmMInt * 100 / 60;
                    tpvmSInt = tpvmSInt * 100 / 60; /* On passe en base 100 */

                    tpvmMInt = tpvmMInt * 0.01;
                    tpvmSInt = tpvmSInt * 0.0001;

                    var tpvm = tpvmHInt + tpvmMInt + tpvmSInt;

                    var vitesseMoyenne = distanceKmFloat / tpvm; //d/t
                    var vitesseMoyenne = Math.round(100 * vitesseMoyenne) / 100;

                    var vitesseMoyenneResultatSpan = document.getElementById('vitesse-moyenne-resultat-vitesse');
                    vitesseMoyenneResultatSpan.textContent = vitesseMoyenne;
                }else{
                    alert('Vous avez rentré une valeur supérieure à 59 dans le champ secondes');
                }
            }else{
                alert('Vous avez rentré une valeur supérieure à 59 dans le champ minutes');
            }
        }else{
            alert('Vous avez rentré une valeur trop haute dans le champ heures');
        }
    }else{
        alert("Vous n'avez rien rentré");
    }

    var vitesseMoyenneContainer = document.getElementById("vitesse-moyenne-container");
    vitesseMoyenneContainer.style.display = "none";
    var vitesseMoyenneResultatContainer = document.getElementById("vitesse-moyenne-resultat-container");
    vitesseMoyenneResultatContainer.style.display = "block";
});

$('#vitesse-moyenne-resultat-btn').click(function() {
    displayDefaultInterfaceVitesseMoyenne();
});

function displayDefaultInterfaceVitesseMoyenne(){
    var vitesseMoyenneContainer = document.getElementById("vitesse-moyenne-container");
    vitesseMoyenneContainer.style.display = "block";
    var vitesseMoyenneResultatContainer = document.getElementById("vitesse-moyenne-resultat-container");
    vitesseMoyenneResultatContainer.style.display = "none";
    document.getElementById("vitesse-moyenne-input-h").value = "";
    document.getElementById("vitesse-moyenne-input-m").value = "";
    document.getElementById("vitesse-moyenne-input-s").value = "";
}




var saveContainer = document.getElementById('saveContainer');

mapFilter.onclick = function() {
    menuGauche.style.display = "none";
    mapFilter.style.display = "none";

    displayDefaultInterfaceTempsNecessaire();
    displayDefaultInterfaceVitesseMoyenne();
};

$('#savePath').click(function() {
    mapFilterForm.style.display = "block";
    saveContainer.style.display = "block";

    var monPath = globalPoly.getPath();
    var encodeString = google.maps.geometry.encoding.encodePath(monPath);
    var hiddenInputPath = document.getElementById('hiddenInputPath');
    var hiddenInputPlaceId = document.getElementById('hiddenInputPlaceId');

    hiddenInputPath.value = encodeString;

    var geocoder = new google.maps.Geocoder;

    latitude = firstMarker.getPosition().lat();
    longitude = firstMarker.getPosition().lng();
    var latlng = {lat: parseFloat(latitude), lng: parseFloat(longitude)};

    geocoder.geocode({'location': latlng}, function(results, status) {
        if (status === google.maps.GeocoderStatus.OK) {
            if (results[1]) {
                hiddenInputPlaceId.value = results[1].place_id;
            } else {
                alert('Aucun résultat trouvé');
            }
        } else {
            alert('Le Geocoder a echoué. Raison: ' + status);
        }
    });


});

var mapFilterForm = document.getElementById('mapFilterForm');
mapFilterForm.onclick = function() {
    saveContainer.style.display = "none";
    mapFilterForm.style.display = "none";
};



function getCoordinatesAverage(){
    var geocoder = new google.maps.Geocoder;

    latitude = firstMarker.getPosition().lat();
    longitude = firstMarker.getPosition().lng();
    var latlng = {lat: parseFloat(latitude), lng: parseFloat(longitude)};

    geocoder.geocode({'location': latlng}, function(results, status) {
        if (status === google.maps.GeocoderStatus.OK) {
            if (results[1]) {
                console.log(results[1].place_id);
            } else {
                window.alert('No results found');
            }
        } else {
            window.alert('Geocoder failed due to: ' + status);
        }
    });
}




/***** RACCOURCIS CLAVIER ********/
Mousetrap.bind(['ctrl+z'], function() {
    deleteLastPoint();
});




//zoom/dezoom avec Ctrl Alt +/- ou Ctrl +/-
var zoom = 14;

Mousetrap.bind(['ctrl+alt++', 'ctrl++'], function() {
    if(zoom <= 23){
        zoom++;
        map.setZoom(zoom);
    }else{
        alert('Impossible de zoomer davantage');
    }
});

Mousetrap.bind(['ctrl+alt+-', 'ctrl+-'], function() {
    if(zoom >= 1){
        zoom--;
        map.setZoom(zoom);
    }else{
        alert('Impossible de dézoomer davantage');
    }
});