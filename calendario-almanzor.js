// Horario base y cruces de Almanzor. Las posiciones se resuelven por grupo.
const EVENT_ID = "almanzor-2026-11-21";
const DATA_FILE = "datos-almanzor-2026.json";
const GROUP_SLOTS = {
  "Mixto": {
    "A": [
      "XA1",
      "XA2",
      "XA3",
      "XA4",
      "XA5"
    ],
    "B": [
      "XB1",
      "XB2",
      "XB3",
      "XB4"
    ],
    "C": [
      "XC1",
      "XC2",
      "XC3",
      "XC4"
    ]
  },
  "Masculino": {
    "A": [
      "MA1",
      "MA2",
      "MA3",
      "MA4",
      "MA5"
    ],
    "B": [
      "MB1",
      "MB2",
      "MB3",
      "MB4"
    ],
    "C": [
      "MC1",
      "MC2",
      "MC3",
      "MC4"
    ]
  },
  "Femenino": {
    "único": [
      "F1",
      "F2",
      "F3",
      "F4",
      "F5"
    ]
  }
};
const FIXTURES = [
  {"id": "XG01", "start": "09:30", "end": "09:50", "court": 1, "category": "Mixto", "stage": "Grupo A", "a": "XA2", "b": "XA5"},
  {"id": "XG02", "start": "09:30", "end": "09:50", "court": 2, "category": "Mixto", "stage": "Grupo A", "a": "XA3", "b": "XA4"},
  {"id": "XG03", "start": "09:30", "end": "09:50", "court": 3, "category": "Mixto", "stage": "Grupo B", "a": "XB1", "b": "XB4"},
  {"id": "XG04", "start": "09:30", "end": "09:50", "court": 4, "category": "Mixto", "stage": "Grupo B", "a": "XB2", "b": "XB3"},
  {"id": "XG05", "start": "09:30", "end": "09:50", "court": 5, "category": "Mixto", "stage": "Grupo C", "a": "XC1", "b": "XC4"},
  {"id": "XG14", "start": "09:30", "end": "09:50", "court": 6, "category": "Mixto", "stage": "Grupo C", "a": "XC2", "b": "XC3"},
  {"id": "XG06", "start": "09:55", "end": "10:15", "court": 1, "category": "Mixto", "stage": "Grupo A", "a": "XA1", "b": "XA5"},
  {"id": "XG07", "start": "09:55", "end": "10:15", "court": 2, "category": "Mixto", "stage": "Grupo A", "a": "XA2", "b": "XA3"},
  {"id": "XG12", "start": "09:55", "end": "10:15", "court": 3, "category": "Mixto", "stage": "Grupo B", "a": "XB1", "b": "XB3"},
  {"id": "XG13", "start": "09:55", "end": "10:15", "court": 4, "category": "Mixto", "stage": "Grupo B", "a": "XB4", "b": "XB2"},
  {"id": "XG08", "start": "09:55", "end": "10:15", "court": 5, "category": "Mixto", "stage": "Grupo C", "a": "XC1", "b": "XC3"},
  {"id": "XG09", "start": "09:55", "end": "10:15", "court": 6, "category": "Mixto", "stage": "Grupo C", "a": "XC2", "b": "XC4"},
  {"id": "XG10", "start": "10:20", "end": "10:40", "court": 1, "category": "Mixto", "stage": "Grupo A", "a": "XA1", "b": "XA4"},
  {"id": "XG11", "start": "10:20", "end": "10:40", "court": 2, "category": "Mixto", "stage": "Grupo A", "a": "XA5", "b": "XA3"},
  {"id": "XG21", "start": "10:20", "end": "10:40", "court": 3, "category": "Mixto", "stage": "Grupo B", "a": "XB1", "b": "XB2"},
  {"id": "XG22", "start": "10:20", "end": "10:40", "court": 4, "category": "Mixto", "stage": "Grupo B", "a": "XB3", "b": "XB4"},
  {"id": "XG17", "start": "10:20", "end": "10:40", "court": 5, "category": "Mixto", "stage": "Grupo C", "a": "XC1", "b": "XC2"},
  {"id": "XG18", "start": "10:20", "end": "10:40", "court": 6, "category": "Mixto", "stage": "Grupo C", "a": "XC3", "b": "XC4"},
  {"id": "XG15", "start": "10:45", "end": "11:05", "court": 1, "category": "Mixto", "stage": "Grupo A", "a": "XA1", "b": "XA3"},
  {"id": "XG16", "start": "10:45", "end": "11:05", "court": 2, "category": "Mixto", "stage": "Grupo A", "a": "XA4", "b": "XA2"},
  {"id": "XP1", "start": "10:50", "end": "11:10", "court": 3, "category": "Mixto", "stage": "Previa 1", "a": "2.º grupo B", "b": "4.º grupo C"},
  {"id": "XG19", "start": "11:10", "end": "11:30", "court": 1, "category": "Mixto", "stage": "Grupo A", "a": "XA1", "b": "XA2"},
  {"id": "XG20", "start": "11:10", "end": "11:30", "court": 2, "category": "Mixto", "stage": "Grupo A", "a": "XA4", "b": "XA5"},
  {"id": "XQ1", "start": "11:40", "end": "12:00", "court": 1, "category": "Mixto", "stage": "Cuartos 1", "a": "1.º grupo A", "b": "Gan. XP1"},
  {"id": "XP2", "start": "11:40", "end": "12:00", "court": 2, "category": "Mixto", "stage": "Previa 2", "a": "4.º grupo A", "b": "3.º grupo C"},
  {"id": "XP3", "start": "11:40", "end": "12:00", "court": 3, "category": "Mixto", "stage": "Previa 3", "a": "2.º grupo C", "b": "5.º grupo A"},
  {"id": "XP4", "start": "11:40", "end": "12:00", "court": 4, "category": "Mixto", "stage": "Previa 4", "a": "3.º grupo A", "b": "3.º grupo B"},
  {"id": "XP5", "start": "11:40", "end": "12:00", "court": 5, "category": "Mixto", "stage": "Previa 5", "a": "2.º grupo A", "b": "4.º grupo B"},
  {"id": "XQ2", "start": "12:10", "end": "12:30", "court": 2, "category": "Mixto", "stage": "Cuartos 2", "a": "1.º grupo C", "b": "Gan. XP4"},
  {"id": "XQ3", "start": "12:10", "end": "12:30", "court": 3, "category": "Mixto", "stage": "Cuartos 3", "a": "1.º grupo B", "b": "Gan. XP2"},
  {"id": "XQ4", "start": "12:10", "end": "12:30", "court": 4, "category": "Mixto", "stage": "Cuartos 4", "a": "Gan. XP3", "b": "Gan. XP5"},
  {"id": "XS1", "start": "12:40", "end": "13:25", "court": 1, "category": "Mixto", "stage": "Semifinal 1", "a": "Gan. XQ1", "b": "Gan. XQ2"},
  {"id": "XS2", "start": "12:40", "end": "13:25", "court": 2, "category": "Mixto", "stage": "Semifinal 2", "a": "Gan. XQ3", "b": "Gan. XQ4"},
  {"id": "XFIN", "start": "13:40", "end": "14:25", "court": 1, "category": "Mixto", "stage": "Final", "a": "Gan. XS1", "b": "Gan. XS2"},
  {"id": "MG01", "start": "14:30", "end": "14:50", "court": 1, "category": "Masculino", "stage": "Grupo A", "a": "MA2", "b": "MA5"},
  {"id": "MG02", "start": "14:30", "end": "14:50", "court": 2, "category": "Masculino", "stage": "Grupo A", "a": "MA3", "b": "MA4"},
  {"id": "MG03", "start": "14:30", "end": "14:50", "court": 3, "category": "Masculino", "stage": "Grupo B", "a": "MB1", "b": "MB4"},
  {"id": "MG04", "start": "14:30", "end": "14:50", "court": 4, "category": "Masculino", "stage": "Grupo B", "a": "MB2", "b": "MB3"},
  {"id": "MG05", "start": "14:30", "end": "14:50", "court": 5, "category": "Masculino", "stage": "Grupo C", "a": "MC1", "b": "MC4"},
  {"id": "FG01", "start": "14:30", "end": "14:50", "court": 6, "category": "Femenino", "stage": "Grupo único", "a": "F2", "b": "F5"},
  {"id": "FG02", "start": "14:30", "end": "14:50", "court": 7, "category": "Femenino", "stage": "Grupo único", "a": "F3", "b": "F4"},
  {"id": "MG06", "start": "14:55", "end": "15:15", "court": 1, "category": "Masculino", "stage": "Grupo A", "a": "MA1", "b": "MA5"},
  {"id": "MG07", "start": "14:55", "end": "15:15", "court": 2, "category": "Masculino", "stage": "Grupo A", "a": "MA2", "b": "MA3"},
  {"id": "MG12", "start": "14:55", "end": "15:15", "court": 3, "category": "Masculino", "stage": "Grupo B", "a": "MB1", "b": "MB3"},
  {"id": "MG13", "start": "14:55", "end": "15:15", "court": 4, "category": "Masculino", "stage": "Grupo B", "a": "MB4", "b": "MB2"},
  {"id": "MG14", "start": "14:55", "end": "15:15", "court": 5, "category": "Masculino", "stage": "Grupo C", "a": "MC2", "b": "MC3"},
  {"id": "FG03", "start": "14:55", "end": "15:15", "court": 6, "category": "Femenino", "stage": "Grupo único", "a": "F1", "b": "F5"},
  {"id": "FG04", "start": "14:55", "end": "15:15", "court": 7, "category": "Femenino", "stage": "Grupo único", "a": "F2", "b": "F3"},
  {"id": "MG10", "start": "15:20", "end": "15:40", "court": 1, "category": "Masculino", "stage": "Grupo A", "a": "MA1", "b": "MA4"},
  {"id": "MG11", "start": "15:20", "end": "15:40", "court": 2, "category": "Masculino", "stage": "Grupo A", "a": "MA5", "b": "MA3"},
  {"id": "MG21", "start": "15:20", "end": "15:40", "court": 3, "category": "Masculino", "stage": "Grupo B", "a": "MB1", "b": "MB2"},
  {"id": "MG08", "start": "15:20", "end": "15:40", "court": 4, "category": "Masculino", "stage": "Grupo C", "a": "MC1", "b": "MC3"},
  {"id": "MG09", "start": "15:20", "end": "15:40", "court": 5, "category": "Masculino", "stage": "Grupo C", "a": "MC2", "b": "MC4"},
  {"id": "FG05", "start": "15:20", "end": "15:40", "court": 6, "category": "Femenino", "stage": "Grupo único", "a": "F1", "b": "F4"},
  {"id": "FG06", "start": "15:20", "end": "15:40", "court": 7, "category": "Femenino", "stage": "Grupo único", "a": "F5", "b": "F3"},
  {"id": "MG15", "start": "15:45", "end": "16:05", "court": 1, "category": "Masculino", "stage": "Grupo A", "a": "MA1", "b": "MA3"},
  {"id": "MG16", "start": "15:45", "end": "16:05", "court": 2, "category": "Masculino", "stage": "Grupo A", "a": "MA4", "b": "MA2"},
  {"id": "MG22", "start": "15:45", "end": "16:05", "court": 3, "category": "Masculino", "stage": "Grupo B", "a": "MB3", "b": "MB4"},
  {"id": "MG17", "start": "15:45", "end": "16:05", "court": 4, "category": "Masculino", "stage": "Grupo C", "a": "MC1", "b": "MC2"},
  {"id": "MG18", "start": "15:45", "end": "16:05", "court": 5, "category": "Masculino", "stage": "Grupo C", "a": "MC3", "b": "MC4"},
  {"id": "FG07", "start": "15:45", "end": "16:05", "court": 6, "category": "Femenino", "stage": "Grupo único", "a": "F1", "b": "F3"},
  {"id": "FG08", "start": "15:45", "end": "16:05", "court": 7, "category": "Femenino", "stage": "Grupo único", "a": "F4", "b": "F2"},
  {"id": "MG19", "start": "16:10", "end": "16:30", "court": 1, "category": "Masculino", "stage": "Grupo A", "a": "MA1", "b": "MA2"},
  {"id": "MG20", "start": "16:10", "end": "16:30", "court": 2, "category": "Masculino", "stage": "Grupo A", "a": "MA4", "b": "MA5"},
  {"id": "FG09", "start": "16:10", "end": "16:30", "court": 6, "category": "Femenino", "stage": "Grupo único", "a": "F1", "b": "F2"},
  {"id": "FG10", "start": "16:10", "end": "16:30", "court": 7, "category": "Femenino", "stage": "Grupo único", "a": "F4", "b": "F5"},
  {"id": "MP1", "start": "16:15", "end": "16:35", "court": 3, "category": "Masculino", "stage": "Previa 1", "a": "2.º grupo B", "b": "4.º grupo C"},
  {"id": "MP2", "start": "16:40", "end": "17:00", "court": 2, "category": "Masculino", "stage": "Previa 2", "a": "4.º grupo A", "b": "3.º grupo C"},
  {"id": "MP3", "start": "16:40", "end": "17:00", "court": 3, "category": "Masculino", "stage": "Previa 3", "a": "2.º grupo C", "b": "5.º grupo A"},
  {"id": "MP4", "start": "16:40", "end": "17:00", "court": 4, "category": "Masculino", "stage": "Previa 4", "a": "3.º grupo A", "b": "3.º grupo B"},
  {"id": "MP5", "start": "16:40", "end": "17:00", "court": 5, "category": "Masculino", "stage": "Previa 5", "a": "2.º grupo A", "b": "4.º grupo B"},
  {"id": "FS1", "start": "16:40", "end": "17:25", "court": 6, "category": "Femenino", "stage": "Semifinal 1", "a": "1.º grupo único", "b": "4.º grupo único"},
  {"id": "FS2", "start": "16:40", "end": "17:25", "court": 7, "category": "Femenino", "stage": "Semifinal 2", "a": "2.º grupo único", "b": "3.º grupo único"},
  {"id": "MQ1", "start": "16:45", "end": "17:05", "court": 1, "category": "Masculino", "stage": "Cuartos 1", "a": "1.º grupo A", "b": "Gan. MP1"},
  {"id": "MQ2", "start": "17:10", "end": "17:30", "court": 2, "category": "Masculino", "stage": "Cuartos 2", "a": "1.º grupo C", "b": "Gan. MP4"},
  {"id": "MQ3", "start": "17:10", "end": "17:30", "court": 3, "category": "Masculino", "stage": "Cuartos 3", "a": "1.º grupo B", "b": "Gan. MP2"},
  {"id": "MQ4", "start": "17:10", "end": "17:30", "court": 4, "category": "Masculino", "stage": "Cuartos 4", "a": "Gan. MP3", "b": "Gan. MP5"},
  {"id": "MS1", "start": "17:40", "end": "18:25", "court": 1, "category": "Masculino", "stage": "Semifinal 1", "a": "Gan. MQ1", "b": "Gan. MQ2"},
  {"id": "MS2", "start": "17:40", "end": "18:25", "court": 2, "category": "Masculino", "stage": "Semifinal 2", "a": "Gan. MQ3", "b": "Gan. MQ4"},
  {"id": "FFIN", "start": "17:40", "end": "18:25", "court": 6, "category": "Femenino", "stage": "Final", "a": "Gan. FS1", "b": "Gan. FS2"},
  {"id": "FBR", "start": "17:40", "end": "18:25", "court": 7, "category": "Femenino", "stage": "Bronce", "a": "Perd. FS1", "b": "Perd. FS2"},
  {"id": "MFIN", "start": "18:40", "end": "19:25", "court": 1, "category": "Masculino", "stage": "Final", "a": "Gan. MS1", "b": "Gan. MS2"},
  {"id": "MBR", "start": "18:40", "end": "19:25", "court": 2, "category": "Masculino", "stage": "Bronce", "a": "Perd. MS1", "b": "Perd. MS2"}
];
