import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../utils/prisma";

const r = Router();

const normalizeIdentifier = (value: unknown): string | null => {
  if (!value) {
    return null;
  }
  const str = Array.isArray(value) ? value[0] : value;
  if (typeof str !== "string") {
    return null;
  }
  const trimmed = str.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const currentUserId = (req: any): string | null => {
  return normalizeIdentifier(req.headers["x-user-id"]) ?? null;
};

async function ensureUser(id: string) {
  return prisma.user.upsert({
    where: { id },
    update: {},
    create: { id, email: `${id}@demo.local`, username: id, passwordHash: "" },
  });
}

r.get("/", (_req, res) => {
  res.json({ ok: true, scope: "users" });
});

r.get("/me", async (req, res) => {
  const id = currentUserId(req);
  if (!id) {
    return res.status(401).json({ error: "Unauthenticated" });
  }
  const user = await ensureUser(id);
  res.json({
    id: user.id,
    email: user.email,
    username: user.username,
    avatarUrl: user.avatarUrl ?? null,
    role: user.role,
  });
});

r.patch("/me", async (req, res) => {
  const id = currentUserId(req);
  if (!id) {
    return res.status(401).json({ error: "Unauthenticated" });
  }
  await ensureUser(id);

  const updates: Record<string, unknown> = {};
  if (typeof req.body?.username === "string") {
    const trimmed = req.body.username.trim();
    if (trimmed) {
      updates.username = trimmed;
    }
  }
  if (typeof req.body?.avatarUrl === "string") {
    const trimmed = req.body.avatarUrl.trim();
    updates.avatarUrl = trimmed || null;
  } else if (req.body?.avatarUrl === null) {
    updates.avatarUrl = null;
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "No valid fields to update" });
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: updates,
    });
    return res.json({
      id: user.id,
      email: user.email,
      username: user.username,
      avatarUrl: user.avatarUrl ?? null,
      role: user.role,
    });
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return res.status(409).json({ error: "Username already in use" });
    }
    console.error("Failed to update profile", error);
    return res.status(500).json({ error: "Failed to update profile" });
  }
});

r.delete("/me", async (req, res) => {
  const id = currentUserId(req);
  if (!id) {
    return res.status(401).json({ error: "Unauthenticated" });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "User not found" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.playerAnswer.deleteMany({
        where: { player: { userId: id } },
      });
      await tx.player.deleteMany({
        where: { userId: id },
      });
      await tx.match.deleteMany({
        where: { hostUserId: id },
      });
      await tx.refreshToken.deleteMany({
        where: { userId: id },
      });
      await tx.user.delete({ where: { id } });
    });

    return res.status(204).send();
  } catch (error) {
    console.error("Failed to delete account", error);
    return res.status(500).json({ error: "Failed to delete account" });
  }
});

export default r;
