const express = require("express");
const mysql = require("mysql2");

const app = express();
// Configuración de la conexión a la base de datos MySQL
const connection = mysql.createConnection({
  port: 3306,
  host: "localhost", // Cambia 'localhost' por el host de tu base de datos
  user: "root", // Reemplaza 'tu_usuario' por el nombre de usuario de MySQL
  password: "", // Reemplaza 'tu_contraseña' por la contraseña de MySQL
  database: "agenda", // Reemplaza 'nombre_base_datos' con el nombre de tu base de datos
});

// Conexión a la base de datos
connection.connect((err) => {
  if (err) {
    console.error("Error conectándose a la base de datos:", err);
    return;
  }
  console.log("Conexión exitosa a la base de datos MySQL");
});

// Configuración de Pug como motor de plantillas
app.set("view engine", "pug");
app.set("views", "./views"); // Especifica la carpeta "views" directamente
app.use(express.urlencoded({ extended: true }));

// Archivos estáticos (CSS, imágenes, etc.)
app.use(express.static("./public"));

// Ruta principal
app.get("/", (req, res) => {
  res.render("index"); // Renderiza `views/index.pug`
});

//////////////////////////////////RUTAS/////////////////////////////////////////////////////////////

////////////////////////////////// "Ruta para la gestión de la vista /medico"////////////////////////////////////
app.get("/medicos", (req, res) => {
  const { nombre, especialidad } = req.query;
  let query = `
    SELECT medico_id, nombre, apellido, matricula, estado, especialidad
    FROM medicos
  `;

  const queryParams = [];

  if (nombre || especialidad) {
    query += " WHERE";
    if (nombre) {
      query += " nombre LIKE ?";
      queryParams.push(`%${nombre}%`);
    }
    if (especialidad) {
      query += nombre ? " AND" : "";
      query += " especialidad LIKE ?";
      queryParams.push(`%${especialidad}%`);
    }
  }

  connection.query(query, queryParams, (err, results) => {
    if (err) {
      console.error("Error ejecutando la consulta:", err);
      return res.render("medicos", { medicos: [] }); // Enviar arreglo vacío en caso de error
    }
    res.render("medicos", { medicos: results || [], nombre, especialidad });
  });
});

/////////////////////////////////////////////RUTA PARA LAS VISTA EDITAR , NUEVO  Y BORRAR ///////////////////////////////////////////////////////////////////////////////

//////// PARA EDITAR MEDICO ////////
// Ruta para cargar la vista de edición de un médico
app.get("/editar-medico/:id", (req, res) => {
  const medicoId = req.params.id;

  // Obtener los detalles del médico
  const queryMedico = "SELECT * FROM medicos WHERE medico_id = ?";
  connection.query(queryMedico, [medicoId], (err, result) => {
    if (err) {
      console.error("Error al obtener el médico:", err);
      return res.redirect("/medicos");
    }
    const medico = result[0];

    // Renderizar la vista de edición
    res.render("edita-medico", { medico });
  });
});

// Ruta para guardar la edición de un médico
app.post("/editar-medico/:id", (req, res) => {
  const medicoId = req.params.id;
  const { nombre, apellido, matricula, estado, especialidad } = req.body;

  // Actualizar los detalles del médico en la base de datos
  const query = `
    UPDATE medicos 
    SET nombre = ?, apellido = ?, matricula = ?, estado = ?, especialidad = ? 
    WHERE medico_id = ?
  `;

  connection.query(
    query,
    [nombre, apellido, matricula, estado, especialidad, medicoId],
    (err, result) => {
      if (err) {
        console.error("Error al actualizar el médico:", err);
        return res.redirect(`/editar-medico/${medicoId}`);
      }

      res.redirect("/medicos"); // Redirigir a la lista de médicos
    }
  );
});

//////////////////////////////PARA BORRAR MEDICO////////////////////////////////////////////
// Ruta para borrar un médico
app.post("/borrar-medico/:id", (req, res) => {
  const medicoId = req.params.id;

  // Consulta para eliminar al médico de la base de datos
  const queryEliminarMedico = "DELETE FROM medicos WHERE medico_id = ?";

  connection.query(queryEliminarMedico, [medicoId], (err, result) => {
    if (err) {
      console.error("Error al eliminar el médico:", err);
      return res.status(500).send("Error al eliminar el médico");
    }

    // Redirigir al listado de médicos después de eliminar
    res.redirect("/medicos");
  });
});

//////////////////////////////NUEVO MEDICO//////////////////////////////////////////////
// Ruta para procesar el formulario de nuevo médico

// Ruta para mostrar la vista de nuevo-medico
app.get("/nuevo-medico", (req, res) => {
  res.render("nuevo-medico"); // Renderiza la vista de 'nuevo-medico.pug'
});

// Ruta para procesar el formulario y validar antes de insertar
app.post("/nuevo-medico", (req, res) => {
  const { nombre, apellido, matricula, estado, especialidad } = req.body;

  // Validar que la matrícula no exista ya en la base de datos
  const queryMatricula = `SELECT * FROM medicos WHERE matricula = ?`;

  connection.query(queryMatricula, [matricula], (err, matriculaResults) => {
    if (err) {
      console.error("Error al validar la matrícula:", err);
      return res.status(500).send("Error en la validación de la matrícula");
    }

    if (matriculaResults.length > 0) {
      // Si la matrícula ya existe, mostrar mensaje específico
      return res.render("nuevo-medico", {
        mensajeError: "La matrícula ya está registrada.",
      });
    }

    // Validar que no exista un médico con el mismo nombre, apellido y especialidad
    const queryEspecialidad = `
      SELECT * FROM medicos 
      WHERE nombre = ? AND apellido = ? AND especialidad = ?
    `;

    connection.query(
      queryEspecialidad,
      [nombre, apellido, especialidad],
      (err, especialidadResults) => {
        if (err) {
          console.error("Error al validar la especialidad del médico:", err);
          return res.status(500).send("Error en la validación del médico");
        }

        if (especialidadResults.length > 0) {
          // Si el médico ya tiene la especialidad, mostrar mensaje específico
          return res.render("nuevo-medico", {
            mensajeError: "El médico ya tiene registrada esta especialidad.",
          });
        }

        // Insertar el médico si no hay conflicto de matrícula ni especialidad
        const queryInsert = `
        INSERT INTO medicos (nombre, apellido, matricula, estado, especialidad)
        VALUES (?, ?, ?, ?, ?)
      `;

        connection.query(
          queryInsert,
          [nombre, apellido, matricula, estado, especialidad],
          (err) => {
            if (err) {
              console.error("Error al insertar el nuevo médico:", err);
              return res.status(500).send("Error al insertar el nuevo médico");
            }
            res.redirect("/medicos"); // Redirige a la lista de médicos tras el éxito
          }
        );
      }
    );
  });
});

/////////////////////////////////////////AGENDAR TURNO ///////////////////////////////////////////////
// Ruta para mostrar la vista de agendar turno con médico preseleccionado
app.get("/agendar-turno", (req, res) => {
  const selectedMedico = req.query.medico_id || null;
  const medicosQuery =
    'SELECT medico_id, nombre, apellido, especialidad FROM Medicos WHERE estado = "activo"';

  connection.query(medicosQuery, (err, medicos) => {
    if (err) {
      console.error("Error al obtener médicos:", err);
      return res.status(500).send("Error al cargar médicos");
    }
    res.render("agendar_turno", {
      medicos,
      selectedMedico,
      error: req.query.error,
    });
  });
});

// Ruta para obtener horarios disponibles para un médico en una fecha específica
app.get("/horarios-disponibles/:medico_id", (req, res) => {
  const medicoId = req.params.medico_id;
  const fecha = req.query.fecha;

  const horarioQuery = `
    SELECT hora_inicio, hora_fin
    FROM Medicos
    WHERE medico_id = ?
  `;

  connection.query(horarioQuery, [medicoId], (err, results) => {
    if (err) {
      console.error("Error al obtener el horario del médico:", err);
      return res.status(500).send("Error al obtener horario del médico");
    }

    if (!results.length) {
      return res.status(404).send("Horario del médico no encontrado");
    }

    const { hora_inicio, hora_fin } = results[0];
    const horariosDisponibles = [];
    let horaActual = new Date(`1970-01-01T${hora_inicio}`);
    const horaLimite = new Date(`1970-01-01T${hora_fin}`);

    while (horaActual < horaLimite) {
      horariosDisponibles.push(horaActual.toTimeString().slice(0, 5));
      horaActual.setMinutes(horaActual.getMinutes() + 30);
    }

    const turnoQuery = `
      SELECT hora
      FROM Turnos
      WHERE medico_id = ? AND fecha = ? AND estado = 'reservado'
    `;

    connection.query(turnoQuery, [medicoId, fecha], (err, turnosReservados) => {
      if (err) {
        console.error("Error al obtener turnos reservados:", err);
        return res.status(500).send("Error al obtener turnos reservados");
      }

      const horariosReservados = turnosReservados.map((turno) => turno.hora);
      const horariosFinales = horariosDisponibles.filter(
        (hora) => !horariosReservados.includes(hora)
      );

      res.json({ horarios: horariosFinales });
    });
  });
});

// Ruta para agendar un turno
app.post("/agendar-turno", (req, res) => {
  const {
    nombre,
    apellido,
    dni,
    contacto,
    obra_social,
    medico_id,
    fecha,
    hora,
  } = req.body;

  const turnoExistenteQuery = `
    SELECT * FROM Turnos
    WHERE medico_id = ? AND fecha = ? AND hora = ? AND estado = 'reservado'
  `;

  connection.query(
    turnoExistenteQuery,
    [medico_id, fecha, hora],
    (err, turnos) => {
      if (err) {
        console.error("Error al verificar turno existente:", err);
        return res.status(500).send("Error en el servidor al verificar turno");
      }

      if (turnos.length > 0) {
        const errorMessage = encodeURIComponent(
          "El médico ya tiene un turno reservado en esa fecha y hora."
        );
        return res.redirect(
          `/agendar-turno?medico_id=${medico_id}&error=${errorMessage}`
        );
      }

      const pacienteQuery = `
      INSERT INTO Pacientes (nombre, apellido, dni, contacto, obra_social)
      VALUES (?, ?, ?, ?, ?)
    `;

      connection.query(
        pacienteQuery,
        [nombre, apellido, dni, contacto, obra_social],
        (err, result) => {
          if (err) {
            console.error("Error al insertar paciente:", err);
            return res
              .status(500)
              .send("Error en el servidor al agregar el paciente");
          }

          const paciente_id = result.insertId;

          const turnoQuery = `
        INSERT INTO Turnos (paciente_id, medico_id, fecha, hora, estado)
        VALUES (?, ?, ?, ?, 'reservado')
      `;

          connection.query(
            turnoQuery,
            [paciente_id, medico_id, fecha, hora],
            (err) => {
              if (err) {
                console.error("Error al insertar turno:", err);
                return res
                  .status(500)
                  .send("Error en el servidor al agendar el turno");
              }
              res.redirect("/");
            }
          );
        }
      );
    }
  );
});

///////////////////////////////////////////////////////////LISTA DE MEDICO EN EL ENCABEZADO////////////////////////////////////
app.get("/lista_medico", (req, res) => {
  const medicosQuery =
    'SELECT medico_id, nombre, apellido, especialidad, estado FROM Medicos WHERE estado = "activo"';

  connection.query(medicosQuery, (err, medicos) => {
    if (err) {
      console.error("Error al obtener la lista de médicos:", err);
      return res
        .status(500)
        .send("Error en el servidor al cargar la lista de médicos");
    }
    res.render("lista_medico", { medicos });
  });
});

//////////////////////////////////Lista turnos////////////////////////////////////////////////////////////

// Ruta para mostrar la vista listaturnos con la lista de médicos y los turnos de un médico seleccionado
app.get('/listaturnos', (req, res) => {
  const selectedMedico = req.query.medico_id || null;
  const medicosQuery = 'SELECT medico_id, nombre, apellido, especialidad FROM Medicos WHERE estado = "activo"';

  connection.query(medicosQuery, (err, medicos) => {
    if (err) {
      console.error('Error al obtener médicos:', err);
      return res.status(500).send('Error al cargar médicos');
    }

    if (!selectedMedico) {
      return res.render('listaturnos', { medicos, turnos: null, selectedMedico });
    }

    // Consulta para obtener los turnos del médico seleccionado
    const turnosQuery = `
      SELECT Turnos.turno_id, Turnos.fecha, Turnos.hora, Turnos.estado, 
             Pacientes.nombre AS nombre_paciente, Pacientes.apellido AS apellido_paciente
      FROM Turnos
      JOIN Pacientes ON Turnos.paciente_id = Pacientes.paciente_id
      WHERE Turnos.medico_id = ?
    `;

    connection.query(turnosQuery, [selectedMedico], (err, turnos) => {
      if (err) {
        console.error('Error al obtener turnos:', err);
        return res.status(500).send('Error al cargar turnos');
      }
      res.render('listaturnos', { medicos, selectedMedico, turnos });
    });
  });
});

// Ruta para cambiar el estado de un turno
app.post('/cambiar-estado-turno/:turno_id', (req, res) => {
  const turnoId = req.params.turno_id;
  const nuevoEstado = req.body.estado;

  const cambiarEstadoQuery = 'UPDATE Turnos SET estado = ? WHERE turno_id = ?';

  connection.query(cambiarEstadoQuery, [nuevoEstado, turnoId], (err) => {
    if (err) {
      console.error('Error al cambiar estado del turno:', err);
      return res.status(500).send('Error al cambiar estado del turno');
    }
    res.redirect(`/listaturnos?medico_id=${req.query.medico_id}`);
  });
});

// Ruta para eliminar un turno
app.post('/eliminar-turno/:turno_id', (req, res) => {
  const turnoId = req.params.turno_id;

  const eliminarTurnoQuery = 'DELETE FROM Turnos WHERE turno_id = ?';

  connection.query(eliminarTurnoQuery, [turnoId], (err) => {
    if (err) {
      console.error('Error al eliminar turno:', err);
      return res.status(500).send('Error al eliminar turno');
    }
    res.redirect(`/listaturnos?medico_id=${req.query.medico_id}`);
  });
});

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Inicia el servidor
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
