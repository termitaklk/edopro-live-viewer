import socket
import time
import uuid
import tkinter as tk
import struct

def main(id_room):
    server_host = '10.50.0.23'
    server_port = 7911
    parte_1 = '290010'
    player_name = '5700650062007300690074006500560069006500770000000000000000000000000000000000000035001254130000'
    parte_2 = '00000000000000000000000000000000000000000000000000000000000000000000000000000000000028010a00'

    # Convertir id_room de hexadecimal a bytes little-endian
    id_room_bytes = bytes.fromhex(id_room)[::-1]
    create_room_hex = parte_1 + player_name + id_room_bytes.hex() + parte_2

    print(f"Todo el hexa: {create_room_hex}")

    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.connect((server_host, server_port))
        client_id = uuid.uuid4()  # Generar un UUID único para esta conexión
        print(f'Conectado al servidor con ID de sesión {client_id}')

        # Envía el mensaje inicial codificado en hexadecimal
        sock.send(bytes.fromhex(create_room_hex))
        print('Mensaje inicial enviado')

        # Configura un temporizador para desconectar después de 5 minutos
        sock.settimeout(300)  # 300 segundos son 5 minutos

        try:
            while True:
                # Recibe la respuesta del servidor
                response = sock.recv(4096)
                if not response:
                    break

        except socket.timeout:
            print("Tiempo de conexión finalizado.")
        except Exception as e:
            print("Error durante la recepción de datos:", e)
        finally:
            print(f"Conexión {client_id} cerrada")

def mostrar_respuesta(respuesta):
    # Crear ventana
    ventana = tk.Toplevel()
    ventana.title("Respuesta del Servidor")

    try:
        # Intentar leer la respuesta como un entero de 32 bits en little-endian
        valor_entero = struct.unpack('<I', respuesta[:4])[0]
        respuesta_texto = f"Valor entero: {valor_entero}"
    except struct.error:
        respuesta_texto = "Error al decodificar la respuesta"

    # Crear etiqueta para mostrar la respuesta
    label_respuesta = tk.Label(ventana, text=respuesta_texto)
    label_respuesta.pack()

if __name__ == '__main__':
    # Sustituir aquí con el ID de la sala seleccionada
    id_room_seleccionada = '012345'
    main(id_room_seleccionada)



