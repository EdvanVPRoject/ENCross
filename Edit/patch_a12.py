import struct
import subprocess
import os

SRC_SO = r"C:\Users\edvan\.gemini\antigravity\brain\705906be-182f-4dc9-9da3-b70fac86b057\libndk_translation_a12.so"
DST_SO = r"C:\Users\edvan\.gemini\antigravity\brain\705906be-182f-4dc9-9da3-b70fac86b057\libndk_translation_a12_patched.so"

with open(SRC_SO, "rb") as f:
    data = bytearray(f.read())

# =============================================================
# 1. JavaVM helpers at 0x1a8452 (file offset: 0x1a8452 - 0x1000 = 0x1a7452)
# =============================================================
unwrap_vm_vaddr = 0x1a8452
unwrap_vm = bytes([
    0x48, 0x8b, 0x07,               # movq (%rdi), %rax
    0x48, 0x83, 0x78, 0x40, 0x00,   # cmpq $0, 0x40(%rax)
    0x74, 0x07,                     # je +7
    0x48, 0x8b, 0x40, 0x40,         # movq 0x40(%rax), %rax
    0x48, 0x89, 0x07,               # movq %rax, (%rdi)
    0xc3                            # retq
])

unwrap_attach_vaddr = unwrap_vm_vaddr + len(unwrap_vm) # 0x1a8464
disp_att = unwrap_vm_vaddr - (unwrap_attach_vaddr + 5)
unwrap_attach = bytes([0xe8]) + struct.pack('<i', disp_att) + bytes([
    0x48, 0x8d, 0x74, 0x24, 0x10,   # leaq 0x10(%rsp), %rsi
    0xff, 0x60, 0x20                # jmpq *0x20(%rax)
])

unwrap_getenv_vaddr = unwrap_attach_vaddr + len(unwrap_attach) # 0x1a8471
disp_get = unwrap_vm_vaddr - (unwrap_getenv_vaddr + 5)
unwrap_getenv = bytes([0xe8]) + struct.pack('<i', disp_get) + bytes([
    0x48, 0x8d, 0x74, 0x24, 0x10,   # leaq 0x10(%rsp), %rsi
    0xff, 0x60, 0x30                # jmpq *0x30(%rax)
])

unwrap_daemon_vaddr = unwrap_getenv_vaddr + len(unwrap_getenv) # 0x1a847e
disp_dae = unwrap_vm_vaddr - (unwrap_daemon_vaddr + 5)
unwrap_daemon = bytes([0xe8]) + struct.pack('<i', disp_dae) + bytes([
    0x48, 0x8d, 0x74, 0x24, 0x10,   # leaq 0x10(%rsp), %rsi
    0xff, 0x60, 0x38                # jmpq *0x38(%rax)
])

all_helpers = unwrap_vm + unwrap_attach + unwrap_getenv + unwrap_daemon
fo_helpers = unwrap_vm_vaddr - 0x1000
for i, b in enumerate(all_helpers):
    data[fo_helpers + i] = b

for i in range(fo_helpers + len(all_helpers), 0x1a84a0 - 0x1000):
    data[i] = 0xcc

disp_abort1 = 0x1a851e - (0x1a83c4 + 6)
data[0x1a83c4 - 0x1000 + 2 : 0x1a83c4 - 0x1000 + 6] = struct.pack('<i', disp_abort1)

disp_abort2 = 0x1a851e - (0x1a83ce + 6)
data[0x1a83ce - 0x1000 + 2 : 0x1a83ce - 0x1000 + 6] = struct.pack('<i', disp_abort2)

call_att_vaddr = 0x1a84ec
disp_call_att = unwrap_attach_vaddr - (call_att_vaddr + 5)
patch_att = bytes([0xe8]) + struct.pack('<i', disp_call_att) + (b'\x90' * 6)
data[call_att_vaddr - 0x1000 : call_att_vaddr - 0x1000 + 11] = patch_att

call_get_vaddr = 0x1a857b
disp_call_get = unwrap_getenv_vaddr - (call_get_vaddr + 5)
patch_get = bytes([0xe8]) + struct.pack('<i', disp_call_get) + (b'\x90' * 6)
data[call_get_vaddr - 0x1000 : call_get_vaddr - 0x1000 + 11] = patch_get

call_dae_vaddr = 0x1a85ec
disp_call_dae = unwrap_daemon_vaddr - (call_dae_vaddr + 5)
patch_dae = bytes([0xe8]) + struct.pack('<i', disp_call_dae) + (b'\x90' * 6)
data[call_dae_vaddr - 0x1000 : call_dae_vaddr - 0x1000 + 11] = patch_dae

# =============================================================
# 2. Patch ExceptionCheck at 0x1a7f00 (21 bytes)
# =============================================================
exc_code = bytes([
    0x48, 0x8b, 0x3e,                                      # movq (%rsi), %rdi
    0x48, 0x8b, 0x47, 0x08,                                # movq 0x8(%rdi), %rax (Thread*)
    0x48, 0x83, 0xb8, 0xa0, 0x00, 0x00, 0x00, 0x00,        # cmpq $0, 0xa0(%rax) (tlsPtr_.exception)
    0x0f, 0x95, 0xc0,                                      # setne %al
    0x88, 0x06,                                            # movb %al, (%rsi)
    0xc3                                                   # retq
])
fo_exc = 0x1a7f00 - 0x1000
for i, b in enumerate(exc_code):
    data[fo_exc + i] = b
# NOP out the remainder of old ExceptionCheck up to 0x1a7f14
for i in range(fo_exc + len(exc_code), 0x1a7f14 - 0x1000):
    data[i] = 0x90

# =============================================================
# 3. Patch FindClass at 0x1a3840 (Helper at 0x1a3832)
# =============================================================
fc_helper_vaddr = 0x1a3832
findclass_helper = bytes([
    0x48, 0x8b, 0x87, 0xe8, 0x00, 0x00, 0x00,   # movq 0xe8(%rdi), %rax
    0x48, 0x89, 0x07,                           # movq %rax, (%rdi)
    0xff, 0x60, 0x30                            # jmpq *0x30(%rax)
])
fo_fc_helper = fc_helper_vaddr - 0x1000
for i, b in enumerate(findclass_helper):
    data[fo_fc_helper + i] = b

call_fc_vaddr = 0x1a384b
disp_fc = fc_helper_vaddr - (call_fc_vaddr + 5)
patch_fc = bytes([0xe8]) + struct.pack('<i', disp_fc) + bytes([0x90])
fo_call_fc = call_fc_vaddr - 0x1000
for i, b in enumerate(patch_fc):
    data[fo_call_fc + i] = b

# =============================================================
# 4. Patch NewGlobalRef at 0x1a3a0b (21 bytes in place)
# =============================================================
patch_ngr = bytes([
    0x48, 0x8b, 0x87, 0xe8, 0x00, 0x00, 0x00,   # movq 0xe8(%rdi), %rax
    0x48, 0x89, 0x07,                           # movq %rax, (%rdi)
    0xff, 0x90, 0xa8, 0x00, 0x00, 0x00,         # callq *0xa8(%rax)
    0x48, 0x89, 0x03,                           # movq %rax, (%rbx)
    0x5b,                                       # popq %rbx
    0xc3                                        # retq
])
fo_ngr = 0x1a3a0b - 0x1000
for i, b in enumerate(patch_ngr):
    data[fo_ngr + i] = b

# =============================================================
# 5. Patch DeleteGlobalRef at 0x1a3a27 (16 bytes in place)
# =============================================================
patch_dgr = bytes([
    0x48, 0x8b, 0x87, 0xe8, 0x00, 0x00, 0x00,   # movq 0xe8(%rdi), %rax
    0x48, 0x89, 0x07,                           # movq %rax, (%rdi)
    0xff, 0xa0, 0xb0, 0x00, 0x00, 0x00          # jmpq *0xb0(%rax)
])
fo_dgr = 0x1a3a27 - 0x1000
for i, b in enumerate(patch_dgr):
    data[fo_dgr + i] = b
# NOP out up to 0x1a3a40
for i in range(fo_dgr + len(patch_dgr), 0x1a3a40 - 0x1000):
    data[i] = 0x90

# =============================================================
# 6. Patch DeleteLocalRef at 0x1a3a47 (16 bytes in place)
# =============================================================
patch_dlr = bytes([
    0x48, 0x8b, 0x87, 0xe8, 0x00, 0x00, 0x00,   # movq 0xe8(%rdi), %rax
    0x48, 0x89, 0x07,                           # movq %rax, (%rdi)
    0xff, 0xa0, 0xb8, 0x00, 0x00, 0x00          # jmpq *0xb8(%rax)
])
fo_dlr = 0x1a3a47 - 0x1000
for i, b in enumerate(patch_dlr):
    data[fo_dlr + i] = b
# NOP out up to 0x1a3a60
for i in range(fo_dlr + len(patch_dlr), 0x1a3a60 - 0x1000):
    data[i] = 0x90

# =============================================================
# 7. Patch GetMethodID at 0x1a3ce3 (21 bytes in place)
# =============================================================
patch_gmid = bytes([
    0x48, 0x8b, 0x87, 0xe8, 0x00, 0x00, 0x00,   # movq 0xe8(%rdi), %rax
    0x48, 0x89, 0x07,                           # movq %rax, (%rdi)
    0xff, 0x90, 0x08, 0x01, 0x00, 0x00,         # callq *0x108(%rax)
    0x48, 0x89, 0x03,                           # movq %rax, (%rbx)
    0x5b,                                       # popq %rbx
    0xc3                                        # retq
])
fo_gmid = 0x1a3ce3 - 0x1000
for i, b in enumerate(patch_gmid):
    data[fo_gmid + i] = b

# =============================================================
# 8. Patch GetStaticMethodID at 0x1a62a3 (21 bytes in place)
# =============================================================
patch_gsmid = bytes([
    0x48, 0x8b, 0x87, 0xe8, 0x00, 0x00, 0x00,   # movq 0xe8(%rdi), %rax
    0x48, 0x89, 0x07,                           # movq %rax, (%rdi)
    0xff, 0x90, 0x88, 0x03, 0x00, 0x00,         # callq *0x388(%rax)
    0x48, 0x89, 0x03,                           # movq %rax, (%rbx)
    0x5b,                                       # popq %rbx
    0xc3                                        # retq
])
fo_gsmid = 0x1a62a3 - 0x1000
for i, b in enumerate(patch_gsmid):
    data[fo_gsmid + i] = b

# =============================================================
# 9. Patch Call<Type>Method dispatcher at 0x1a7fa0
# Unwraps env->functions before any CallMethod / CallStaticMethod
# Helper at 0x1a848b (17 bytes)
# =============================================================
helper_cm_vaddr = 0x1a848b
helper_cm = bytes([
    0x48, 0x89, 0xcb,                           # movq %rcx, %rbx
    0x49, 0x89, 0xfe,                           # movq %rdi, %r14
    0x48, 0x8b, 0x86, 0xe8, 0x00, 0x00, 0x00,   # movq 0xe8(%rsi), %rax
    0x48, 0x89, 0x06,                           # movq %rax, (%rsi)
    0xc3                                        # retq
])
fo_helper_cm = helper_cm_vaddr - 0x1000
for i, b in enumerate(helper_cm):
    data[fo_helper_cm + i] = b

call_cm_vaddr = 0x1a7fa8
disp_cm = helper_cm_vaddr - (call_cm_vaddr + 5)
patch_cm = bytes([0xe8]) + struct.pack('<i', disp_cm) + bytes([0x90])
fo_call_cm = call_cm_vaddr - 0x1000
for i, b in enumerate(patch_cm):
    data[fo_call_cm + i] = b

with open(DST_SO, "wb") as f:
    f.write(data)

print(f"Patched SO v2 written successfully: {DST_SO} ({len(data)} bytes)!")
