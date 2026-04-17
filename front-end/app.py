import os
import requests
import socket
import uuid
import tkinter as tk
from tkinter import ttk, messagebox, filedialog
from urllib.parse import urlparse
import threading
import pandas as pd
from dotenv import load_dotenv

# Cargar variables de entorno desde el archivo .env
load_dotenv()

# Variables de entorno
url = os.getenv('SERVER_URL')
server_port = int(os.getenv('SERVER_PORT'))

# Listas globales para almacenar los mensajes
mensajes_binarios = []
mensajes_hexadecimales = []

# Contadores globales
contador_recibidos = 1
contador_enviados = 1

def obtener_salas():
    try:
        response = requests.get(url)
        response.raise_for_status()
        json_data = response.json()
        parsed_url = urlparse(url)
        server_ip = parsed_url.hostname
        return server_ip, json_data["rooms"]
    except requests.RequestException as e:
        print(f"Error al conectar con el servidor: {e}")
        return None, None

def recibir_mensajes(sock, text_area_bin, text_area_hex, msg_window_bin, msg_window_hex):
    global contador_recibidos
    try:
        while True:
            response = sock.recv(1024)
            if not response:
                break
            message_size = len(response)
            mensaje_bin = f"Mensaje A{contador_recibidos} ({message_size} bytes) = {response}"
            mensaje_hex = f"Mensaje A{contador_recibidos} ({message_size} bytes) = {response.hex()}"

            mensajes_binarios.append([f"Mensaje A{contador_recibidos} ({message_size} bytes)", response])
            mensajes_hexadecimales.append([f"Mensaje A{contador_recibidos} ({message_size} bytes)", response.hex()])

            text_area_bin.insert(tk.END, f"{mensaje_bin}\n")
            text_area_bin.yview(tk.END)
            text_area_hex.insert(tk.END, f"{mensaje_hex}\n")
            text_area_hex.yview(tk.END)
            contador_recibidos += 1
    except Exception as e:
        print("Error durante la recepción de datos:", e)
    finally:
        sock.close()
        msg_window_bin.destroy()
        msg_window_hex.destroy()

def enviar_mensaje(sock, mensaje_hex, text_area_bin, text_area_hex):
    global contador_enviados
    try:
        mensaje_bin = bytes.fromhex(mensaje_hex)
        sock.send(mensaje_bin)
        message_size = len(mensaje_bin)
        mensaje_bin_str = f"Mensaje B{contador_enviados} ({message_size} bytes) = {mensaje_bin}"
        mensaje_hex_str = f"Mensaje B{contador_enviados} ({message_size} bytes) = {mensaje_hex}"

        mensajes_binarios.append([f"Mensaje B{contador_enviados} ({message_size} bytes)", mensaje_bin])
        mensajes_hexadecimales.append([f"Mensaje B{contador_enviados} ({message_size} bytes)", mensaje_hex])

        text_area_bin.insert(tk.END, f"{mensaje_bin_str}\n")
        text_area_bin.yview(tk.END)
        text_area_hex.insert(tk.END, f"{mensaje_hex_str}\n")
        text_area_hex.yview(tk.END)
        contador_enviados += 1
    except Exception as e:
        print("Error durante el envío de datos:", e)

def exportar_a_excel(ruta_bin, ruta_hex):
    if not mensajes_binarios or not mensajes_hexadecimales:
        messagebox.showwarning("Advertencia", "No hay mensajes para exportar.")
        return
    if not ruta_bin or not ruta_hex:
        messagebox.showwarning("Advertencia", "Por favor, especifique una ruta de archivo.")
        return
    try:
        # Exportar mensajes binarios
        df_bin = pd.DataFrame(mensajes_binarios, columns=["Mensaje", "Contenido"])
        df_bin['Contenido'] = df_bin['Contenido'].apply(lambda x: ' '.join(format(byte, '08b') for byte in x))  # Convertir a binario
        df_bin.to_excel(ruta_bin, index=False)

        # Exportar mensajes hexadecimales
        df_hex = pd.DataFrame(mensajes_hexadecimales, columns=["Mensaje", "Contenido"])
        df_hex.to_excel(ruta_hex, index=False)

        messagebox.showinfo("Éxito", f"Mensajes exportados correctamente a '{ruta_bin}' y '{ruta_hex}'")
    except Exception as e:
        messagebox.showerror("Error", f"Error al exportar a Excel: {str(e)}")

def main(room_id_hex, server_ip):
    parte_1 = '290010'
    player_name = '5700650062007300690074006500560069006500770000000000000000000000000000000000000035001254130000'
    parte_2 = '00000000000000000000000000000000000000000000000000000000000000000000000000000000000028010a00'
    print('Código hexa', room_id_hex)
    id_room_bytes = bytes.fromhex(room_id_hex)[::-1]
    create_room_hex = parte_1 + player_name + id_room_bytes.hex() + parte_2

    print('Código hexa2', create_room_hex)

    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.connect((server_ip, server_port))
    client_id = uuid.uuid4()

    # Ventana para mensajes binarios
    msg_window_bin = tk.Toplevel()
    msg_window_bin.title("Mensajes del Servidor (Binario)")
    text_area_bin = tk.Text(msg_window_bin)
    text_area_bin.pack(expand=True, fill=tk.BOTH)

    # Ventana para mensajes hexadecimales
    msg_window_hex = tk.Toplevel()
    msg_window_hex.title("Mensajes del Servidor (Hexadecimal)")
    text_area_hex = tk.Text(msg_window_hex)
    text_area_hex.pack(expand=True, fill=tk.BOTH)

    threading.Thread(target=recibir_mensajes, args=(sock, text_area_bin, text_area_hex, msg_window_bin, msg_window_hex), daemon=True).start()

    enviar_mensaje(sock, create_room_hex, text_area_bin, text_area_hex)
    print(f'Conectado al servidor con ID de sesión {client_id}')

    msg_window_bin.protocol("WM_DELETE_WINDOW", lambda: [sock.close(), msg_window_bin.destroy(), msg_window_hex.destroy()])
    msg_window_hex.protocol("WM_DELETE_WINDOW", lambda: [sock.close(), msg_window_bin.destroy(), msg_window_hex.destroy()])

def seleccionar_sala():
    selected_item = treeview.focus()
    if not selected_item:
        messagebox.showwarning("Advertencia", "Por favor, selecciona una sala.")
        return
    room = treeview.item(selected_item, "values")
    room_id_hex = room[0]
    room_id_int = int(room_id_hex)
    room_id_hex = format(room_id_int, 'x')
    main(room_id_hex, server_ip)

def seleccionar_archivo():
    ruta_bin = filedialog.asksaveasfilename(defaultextension=".xlsx", filetypes=[("Archivos de Excel", "*.xlsx"), ("Todos los archivos", "*.*")], title="Guardar mensajes binarios")
    ruta_hex = filedialog.asksaveasfilename(defaultextension=".xlsx", filetypes=[("Archivos de Excel", "*.xlsx"), ("Todos los archivos", "*.*")], title="Guardar mensajes hexadecimales")
    if ruta_bin and ruta_hex:
        exportar_a_excel(ruta_bin, ruta_hex)

# Obtener salas del servidor
server_ip, rooms = obtener_salas()
if server_ip is None or rooms is None:
    messagebox.showerror("Error", "No se pudieron obtener las salas.")
    exit(1)

# Interfaz gráfica principal
root = tk.Tk()
root.title("Salas de Duelo")
treeview = ttk.Treeview(root, columns=("Room ID", "Usuarios", "Notas", "LP Inicial"), show="headings")
for room in rooms:
    users = ", ".join(user["name"] for user in room["users"])
    treeview.insert("", "end", values=(room["roomid"], users, room["roomnotes"], room["start_lp"]))
treeview.pack(fill=tk.BOTH, expand=True)

# Botón para conectar a la sala
button = tk.Button(root, text="Conectar a la Sala", command=seleccionar_sala)
button.pack(pady=10)

# Botón para exportar a Excel
button_exportar = tk.Button(root, text="Exportar a Excel", command=seleccionar_archivo)
button_exportar.pack(pady=10)

root.mainloop()
