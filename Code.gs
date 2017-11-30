var FIRST_AGENDA_LINE = 2;

function doGet(e) {
  var template = HtmlService.createTemplateFromFile('GetARoomHome');
    
  // TODO add meta <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  return template
    .evaluate()
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .addMetaTag('mobile-web-app-capable', 'yes')
    .addMetaTag('apple-mobile-web-app-capable', 'yes')
    .setFaviconUrl("http://abpr17.fr/wp-content/uploads/2015/07/logo-u.png")
    .setTitle('Get a Room !');
}

/**
 * inclue une ressource (ex : css)
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename)
      .setSandboxMode(HtmlService.SandboxMode.IFRAME)
      .getContent();
}

function afficherDispo(dateTimeStr) {
  Logger.log('Date entrée : ' + dateTimeStr);
  var dateRecherchee = new Date(dateTimeStr);
  // Hack timezone Paris !
  dateRecherchee.setHours(dateRecherchee.getHours() - 1);
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var s = ss.getSheets()[0];
  
  var agendas = s.getRange(FIRST_AGENDA_LINE, 1, s.getLastRow()+1-FIRST_AGENDA_LINE, 4).getValues();
  
  var etatsSalles = {
    "free":[],
    "busy":[]
  };
  
  Logger.log('date : ' + dateRecherchee);
  
  var endTime = new Date(dateRecherchee);
  endTime.setMinutes(59);
  endTime.setHours(23);
  
  var qBody = {};
  qBody.timeMin = Utilities.formatDate(dateRecherchee, 'GMT', "yyyy-MM-dd'T'HH:mm:ss'Z'");
  qBody.timeMax = Utilities.formatDate(endTime, 'GMT', "yyyy-MM-dd'T'HH:mm:ss'Z'");
  //qBody.timeZone = 'Europe/Paris';
  
  Logger.log('De : ' +  qBody.timeMin);
  Logger.log('A : ' +  qBody.timeMax);
  
  qBody.items = [];
  for (var i = 0; i < agendas.length; i++) {
    qBody.items.push({"id": agendas[i][1]});
  }
  
  qBody.calendarExpansionMax = agendas.length;
  
  var reqs = JSON.stringify(qBody);
  var res = Calendar.Freebusy.query(reqs);
  var rescalendars = res.calendars;
  
  for (var i = 0; i < agendas.length; i++) {
    var agenda = agendas[i];
    var idAgenda = agenda[1];
    Logger.log ('Agenda : ' + idAgenda + ' : ' + agenda[0]);
   
    var cal = rescalendars[idAgenda];
    if (cal.errors) {
      //etatsSalles[i] = agenda.concat(['Inconnu']);
      if (cal.errors[0].reason == 'notFound') {
        Logger.log("Agenda inconnu : " + s.getRange(2 + i, 1).getValue() + ' : ' + JSON.stringify(cal.errors[0])); 
      } else {
        Logger.log("Erreur à la récupération de " + s.getRange(2 + i, 1).getValue() + ' : ' + JSON.stringify(cal.errors[0])); 
      }
// TODO prévoir un mécanisme pour être averti de ce qui n'existe plus !
    } else {
      var busy = cal.busy;
       Logger.log(" -> " + busy.length + " évènements");
       Logger.log(" -> " + JSON.stringify(busy));
      
      var salleOccupee = false;
      var dispoJusque = '23:59';
      var dispoFrom = Utilities.formatDate(dateRecherchee, 'Europe/Paris', "HH:mm");
      
      if (busy.length > 0) {
        var firstEvent = busy[0]; 
        
        if (firstEvent.start == qBody.timeMin) {
          // Logger.log('LA SALLE EST PRISE !!'); 
          salleOccupee = true;
          
          dispoFrom = Utilities.formatDate(new Date(firstEvent.end), 'Europe/Paris', "HH:mm");
          if (busy.length > 1) {
            dispoJusque = Utilities.formatDate(new Date(busy[1].start), 'Europe/Paris', "HH:mm");
          }
        } else {
          dispoJusque = Utilities.formatDate(new Date(firstEvent.start), 'Europe/Paris', "HH:mm");
        }
      }
      
      var liste = salleOccupee ? etatsSalles.busy : etatsSalles.free;
      // Salle || id agenda || Nom ressource || Type || Dispo jusqu'à || Dispo à partir de
      liste.push(agenda.concat(dispoJusque).concat(dispoFrom));
    }
  }
  
  return etatsSalles;
}

function reserver(calId, calName, date, heureDebut, heureFin, sujet) {
  
  Logger.log('Réserver ' + calName + ' (' + calId + ') le ' + date + ' de ' + heureDebut + ' à ' + heureFin + ' : ' + sujet);
  
  var dateSplit = date.split('/');
  var debutSplit = heureDebut.split(':');
  var finSplit = heureFin.split(':');
  
  var dateDebut = new Date(dateSplit[2], +dateSplit[1] - 1, dateSplit[0], debutSplit[0], debutSplit[1]);
  var dateFin = new Date(dateSplit[2], +dateSplit[1] - 1, dateSplit[0], finSplit[0], finSplit[1]);
  
  var salleDispo;
  var qBody = {};
  qBody.timeMin = Utilities.formatDate(dateDebut, 'GMT', "yyyy-MM-dd'T'HH:mm:ss'Z'");
  qBody.timeMax = Utilities.formatDate(dateFin, 'GMT', "yyyy-MM-dd'T'HH:mm:ss'Z'");
  qBody.items = [{"id": calId}];
  var reqs = JSON.stringify(qBody);
  var res = Calendar.Freebusy.query(reqs);
  var roomCalendar = res.calendars[calId];
  if (roomCalendar.busy.length == 0) {
    const event = CalendarApp.createEvent(sujet, dateDebut, dateFin);
    event.addGuest(calId);
    return 'OK';
  } else {
    throw "L'agenda " + calName + " n'est plus libre de " + heureDebut + " à " + heureFin;
  };
}
