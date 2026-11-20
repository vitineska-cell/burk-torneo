// Partidos y códigos de las hojas Partidos y Grupos del cuadrante del 21/11/2026.
const EVENT_ID = "almanzor-2026-11-21";
const DATA_FILE = "datos-almanzor-2026.json";
const GROUP_SLOTS = {
  "Mixto": {
    "A": [
      "XA1",
      "XA2",
      "XA3",
      "XA4"
    ],
    "B": [
      "XB1",
      "XB2",
      "XB3"
    ],
    "C": [
      "XC1",
      "XC2",
      "XC3"
    ],
    "D": [
      "XD1",
      "XD2",
      "XD3"
    ]
  },
  "Masculino": {
    "A": [
      "MA1",
      "MA2",
      "MA3",
      "MA4"
    ],
    "B": [
      "MB1",
      "MB2",
      "MB3"
    ],
    "C": [
      "MC1",
      "MC2",
      "MC3"
    ],
    "D": [
      "MD1",
      "MD2",
      "MD3"
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
  {"id": "X-01", "start": "09:30", "end": "09:52", "court": 1, "category": "Mixto", "stage": "Grupo A · R1", "a": "XA1", "b": "XA4"},
  {"id": "X-02", "start": "09:30", "end": "09:52", "court": 2, "category": "Mixto", "stage": "Grupo A · R1", "a": "XA2", "b": "XA3"},
  {"id": "X-03", "start": "09:30", "end": "09:52", "court": 3, "category": "Mixto", "stage": "Grupo B · R1", "a": "XB1", "b": "XB2"},
  {"id": "X-04", "start": "09:30", "end": "09:52", "court": 4, "category": "Mixto", "stage": "Grupo C · R1", "a": "XC1", "b": "XC2"},
  {"id": "X-05", "start": "09:30", "end": "09:52", "court": 5, "category": "Mixto", "stage": "Grupo D · R1", "a": "XD1", "b": "XD2"},
  {"id": "X-06", "start": "10:02", "end": "10:24", "court": 1, "category": "Mixto", "stage": "Grupo A · R2", "a": "XA1", "b": "XA3"},
  {"id": "X-07", "start": "10:02", "end": "10:24", "court": 2, "category": "Mixto", "stage": "Grupo A · R2", "a": "XA2", "b": "XA4"},
  {"id": "X-08", "start": "10:02", "end": "10:24", "court": 3, "category": "Mixto", "stage": "Grupo B · R2", "a": "XB2", "b": "XB3"},
  {"id": "X-09", "start": "10:02", "end": "10:24", "court": 4, "category": "Mixto", "stage": "Grupo C · R2", "a": "XC2", "b": "XC3"},
  {"id": "X-10", "start": "10:02", "end": "10:24", "court": 5, "category": "Mixto", "stage": "Grupo D · R2", "a": "XD2", "b": "XD3"},
  {"id": "X-11", "start": "10:34", "end": "10:56", "court": 1, "category": "Mixto", "stage": "Grupo A · R3", "a": "XA1", "b": "XA2"},
  {"id": "X-12", "start": "10:34", "end": "10:56", "court": 2, "category": "Mixto", "stage": "Grupo A · R3", "a": "XA3", "b": "XA4"},
  {"id": "X-13", "start": "10:34", "end": "10:56", "court": 3, "category": "Mixto", "stage": "Grupo B · R3", "a": "XB1", "b": "XB3"},
  {"id": "X-14", "start": "10:34", "end": "10:56", "court": 4, "category": "Mixto", "stage": "Grupo C · R3", "a": "XC1", "b": "XC3"},
  {"id": "X-15", "start": "10:34", "end": "10:56", "court": 5, "category": "Mixto", "stage": "Grupo D · R3", "a": "XD1", "b": "XD3"},
  {"id": "X-16", "start": "11:10", "end": "12:25", "court": 1, "category": "Mixto", "stage": "Semifinal 1", "a": "1.º grupo A", "b": "1.º grupo D"},
  {"id": "X-17", "start": "11:10", "end": "12:25", "court": 2, "category": "Mixto", "stage": "Semifinal 2", "a": "1.º grupo B", "b": "1.º grupo C"},
  {"id": "X-18", "start": "11:10", "end": "11:32", "court": 3, "category": "Mixto", "stage": "Puestos 5.º–8.º", "a": "2.º grupo A", "b": "2.º grupo D"},
  {"id": "X-19", "start": "11:10", "end": "11:32", "court": 4, "category": "Mixto", "stage": "Puestos 5.º–8.º", "a": "2.º grupo B", "b": "2.º grupo C"},
  {"id": "X-20", "start": "11:10", "end": "11:32", "court": 5, "category": "Mixto", "stage": "Puestos 9.º–13.º", "a": "3.º grupo A", "b": "3.º grupo D"},
  {"id": "X-21", "start": "11:10", "end": "11:32", "court": 6, "category": "Mixto", "stage": "Puestos 9.º–13.º", "a": "3.º grupo B", "b": "3.º grupo C"},
  {"id": "X-22", "start": "11:45", "end": "12:07", "court": 3, "category": "Mixto", "stage": "5.º puesto", "a": "Gan. X-18", "b": "Gan. X-19"},
  {"id": "X-23", "start": "11:45", "end": "12:07", "court": 4, "category": "Mixto", "stage": "7.º puesto", "a": "Perd. X-18", "b": "Perd. X-19"},
  {"id": "X-24", "start": "11:45", "end": "12:07", "court": 5, "category": "Mixto", "stage": "9.º puesto", "a": "Gan. X-20", "b": "Gan. X-21"},
  {"id": "X-25", "start": "11:45", "end": "12:07", "court": 6, "category": "Mixto", "stage": "Por el 11.º puesto", "a": "Perd. X-20", "b": "Perd. X-21"},
  {"id": "X-26", "start": "12:20", "end": "12:42", "court": 3, "category": "Mixto", "stage": "12.º puesto", "a": "Perd. X-25", "b": "4.º grupo A"},
  {"id": "X-27", "start": "12:35", "end": "13:50", "court": 1, "category": "Mixto", "stage": "Final", "a": "Gan. X-16", "b": "Gan. X-17"},
  {"id": "X-28", "start": "12:35", "end": "12:57", "court": 2, "category": "Mixto", "stage": "3.er puesto", "a": "Perd. X-16", "b": "Perd. X-17"},
  {"id": "M-01", "start": "14:30", "end": "14:52", "court": 1, "category": "Masculino", "stage": "Grupo A · R1", "a": "MA1", "b": "MA2"},
  {"id": "M-02", "start": "14:30", "end": "14:52", "court": 2, "category": "Masculino", "stage": "Grupo B · R1", "a": "MB1", "b": "MB2"},
  {"id": "M-03", "start": "14:30", "end": "14:52", "court": 3, "category": "Masculino", "stage": "Grupo C · R1", "a": "MC1", "b": "MC2"},
  {"id": "M-04", "start": "14:30", "end": "14:52", "court": 4, "category": "Masculino", "stage": "Grupo D · R1", "a": "MD1", "b": "MD2"},
  {"id": "M-29", "start": "14:30", "end": "14:52", "court": 5, "category": "Masculino", "stage": "Grupo A · R1", "a": "MA3", "b": "MA4"},
  {"id": "F-01", "start": "14:30", "end": "14:52", "court": 6, "category": "Femenino", "stage": "Grupo único · R1", "a": "F2", "b": "F5"},
  {"id": "F-02", "start": "14:30", "end": "14:52", "court": 7, "category": "Femenino", "stage": "Grupo único · R1", "a": "F3", "b": "F4"},
  {"id": "M-05", "start": "15:02", "end": "15:24", "court": 1, "category": "Masculino", "stage": "Grupo A · R2", "a": "MA2", "b": "MA3"},
  {"id": "M-06", "start": "15:02", "end": "15:24", "court": 2, "category": "Masculino", "stage": "Grupo B · R2", "a": "MB2", "b": "MB3"},
  {"id": "M-07", "start": "15:02", "end": "15:24", "court": 3, "category": "Masculino", "stage": "Grupo C · R2", "a": "MC2", "b": "MC3"},
  {"id": "M-08", "start": "15:02", "end": "15:24", "court": 4, "category": "Masculino", "stage": "Grupo D · R2", "a": "MD2", "b": "MD3"},
  {"id": "M-30", "start": "15:02", "end": "15:24", "court": 5, "category": "Masculino", "stage": "Grupo A · R2", "a": "MA1", "b": "MA4"},
  {"id": "F-03", "start": "15:02", "end": "15:24", "court": 6, "category": "Femenino", "stage": "Grupo único · R2", "a": "F1", "b": "F5"},
  {"id": "F-04", "start": "15:02", "end": "15:24", "court": 7, "category": "Femenino", "stage": "Grupo único · R2", "a": "F2", "b": "F3"},
  {"id": "M-09", "start": "15:34", "end": "15:56", "court": 1, "category": "Masculino", "stage": "Grupo A · R3", "a": "MA1", "b": "MA3"},
  {"id": "M-10", "start": "15:34", "end": "15:56", "court": 2, "category": "Masculino", "stage": "Grupo B · R3", "a": "MB1", "b": "MB3"},
  {"id": "M-11", "start": "15:34", "end": "15:56", "court": 3, "category": "Masculino", "stage": "Grupo C · R3", "a": "MC1", "b": "MC3"},
  {"id": "M-12", "start": "15:34", "end": "15:56", "court": 4, "category": "Masculino", "stage": "Grupo D · R3", "a": "MD1", "b": "MD3"},
  {"id": "M-31", "start": "15:34", "end": "15:56", "court": 5, "category": "Masculino", "stage": "Grupo A · R3", "a": "MA2", "b": "MA4"},
  {"id": "F-05", "start": "15:34", "end": "15:56", "court": 6, "category": "Femenino", "stage": "Grupo único · R3", "a": "F1", "b": "F4"},
  {"id": "F-06", "start": "15:34", "end": "15:56", "court": 7, "category": "Femenino", "stage": "Grupo único · R3", "a": "F5", "b": "F3"},
  {"id": "F-07", "start": "16:06", "end": "16:28", "court": 6, "category": "Femenino", "stage": "Grupo único · R4", "a": "F1", "b": "F3"},
  {"id": "F-08", "start": "16:06", "end": "16:28", "court": 7, "category": "Femenino", "stage": "Grupo único · R4", "a": "F4", "b": "F2"},
  {"id": "M-13", "start": "16:10", "end": "16:32", "court": 1, "category": "Masculino", "stage": "Cuartos 1", "a": "1.º grupo A", "b": "2.º grupo B"},
  {"id": "M-14", "start": "16:10", "end": "16:32", "court": 2, "category": "Masculino", "stage": "Cuartos 2", "a": "1.º grupo C", "b": "2.º grupo D"},
  {"id": "M-15", "start": "16:10", "end": "16:32", "court": 3, "category": "Masculino", "stage": "Cuartos 3", "a": "1.º grupo B", "b": "2.º grupo A"},
  {"id": "M-16", "start": "16:10", "end": "16:32", "court": 4, "category": "Masculino", "stage": "Cuartos 4", "a": "1.º grupo D", "b": "2.º grupo C"},
  {"id": "M-17", "start": "16:10", "end": "16:32", "court": 5, "category": "Masculino", "stage": "Puestos 9.º–13.º", "a": "3.º grupo A", "b": "3.º grupo C"},
  {"id": "M-22", "start": "16:35", "end": "16:57", "court": 5, "category": "Masculino", "stage": "Puestos 9.º–13.º", "a": "3.º grupo B", "b": "3.º grupo D"},
  {"id": "F-09", "start": "16:38", "end": "17:00", "court": 6, "category": "Femenino", "stage": "Grupo único · R5", "a": "F1", "b": "F2"},
  {"id": "F-10", "start": "16:38", "end": "17:00", "court": 7, "category": "Femenino", "stage": "Grupo único · R5", "a": "F4", "b": "F5"},
  {"id": "M-18", "start": "16:45", "end": "18:00", "court": 1, "category": "Masculino", "stage": "Semifinal 1", "a": "Gan. M-13", "b": "Gan. M-14"},
  {"id": "M-19", "start": "16:45", "end": "18:00", "court": 2, "category": "Masculino", "stage": "Semifinal 2", "a": "Gan. M-15", "b": "Gan. M-16"},
  {"id": "M-20", "start": "16:45", "end": "17:07", "court": 3, "category": "Masculino", "stage": "Puestos 5.º–8.º", "a": "Perd. M-13", "b": "Perd. M-14"},
  {"id": "M-21", "start": "16:45", "end": "17:07", "court": 4, "category": "Masculino", "stage": "Puestos 5.º–8.º", "a": "Perd. M-15", "b": "Perd. M-16"},
  {"id": "M-26", "start": "17:10", "end": "17:32", "court": 5, "category": "Masculino", "stage": "Por el 11.º puesto", "a": "Perd. M-17", "b": "Perd. M-22"},
  {"id": "F-11", "start": "17:10", "end": "18:25", "court": 6, "category": "Femenino", "stage": "Semifinal 1", "a": "1.º grupo único", "b": "4.º grupo único"},
  {"id": "F-12", "start": "17:10", "end": "18:25", "court": 7, "category": "Femenino", "stage": "Semifinal 2", "a": "2.º grupo único", "b": "3.º grupo único"},
  {"id": "M-23", "start": "17:20", "end": "17:42", "court": 3, "category": "Masculino", "stage": "5.º puesto", "a": "Gan. M-20", "b": "Gan. M-21"},
  {"id": "M-24", "start": "17:20", "end": "17:42", "court": 4, "category": "Masculino", "stage": "7.º puesto", "a": "Perd. M-20", "b": "Perd. M-21"},
  {"id": "M-25", "start": "17:35", "end": "17:57", "court": 5, "category": "Masculino", "stage": "9.º puesto", "a": "Gan. M-17", "b": "Gan. M-22"},
  {"id": "M-32", "start": "17:45", "end": "18:07", "court": 3, "category": "Masculino", "stage": "12.º puesto", "a": "Perd. M-26", "b": "4.º grupo A"},
  {"id": "M-27", "start": "18:15", "end": "19:30", "court": 1, "category": "Masculino", "stage": "Final", "a": "Gan. M-18", "b": "Gan. M-19"},
  {"id": "M-28", "start": "18:15", "end": "18:37", "court": 2, "category": "Masculino", "stage": "3.er puesto", "a": "Perd. M-18", "b": "Perd. M-19"},
  {"id": "F-13", "start": "18:35", "end": "19:50", "court": 6, "category": "Femenino", "stage": "Final", "a": "Gan. F-11", "b": "Gan. F-12"}
];
