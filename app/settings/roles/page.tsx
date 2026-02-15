"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Shield, Plus, Edit, Trash2, Users, Lock } from "lucide-react";

const RESOURCES = [
  { key: "customers", label: "Customers" },
  { key: "leads", label: "Leads" },
  { key: "tasks", label: "Tasks" },
  { key: "users", label: "Users" },
];

const PERMISSIONS = [
  { key: "viewAll", label: "View All" },
  { key: "viewDepartment", label: "View Department" },
  { key: "viewTeam", label: "View Team" },
  { key: "viewOwn", label: "View Own" },
  { key: "create", label: "Create" },
  { key: "edit", label: "Edit" },
  { key: "delete", label: "Delete" },
  { key: "invite", label: "Invite" }, // For users
];

export default function RolesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [roles, setRoles] = useState<any[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [permissions, setPermissions] = useState<any>({});

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const res = await fetch("/api/roles");
      if (!res.ok) throw new Error("Failed to fetch roles");
      const data = await res.json();
      setRoles(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const url = editingRole ? `/api/roles/${editingRole.id}` : "/api/roles";
      const method = editingRole ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: roleName,
          description: roleDescription,
          permissions,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save role");
      }

      setSuccess(editingRole ? "Role updated!" : "Role created!");
      setDialogOpen(false);
      resetForm();
      fetchRoles();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this role?")) return;

    try {
      const res = await fetch(`/api/roles/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete role");
      }

      setSuccess("Role deleted!");
      fetchRoles();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const openEditDialog = (role: any) => {
    setEditingRole(role);
    setRoleName(role.name);
    setRoleDescription(role.description || "");
    setPermissions(role.permissions || {});
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingRole(null);
    setRoleName("");
    setRoleDescription("");
    setPermissions({
      customers: {},
      leads: {},
      tasks: {},
      users: {},
    });
  };

  const togglePermission = (resource: string, permission: string) => {
    setPermissions((prev: any) => ({
      ...prev,
      [resource]: {
        ...prev[resource],
        [permission]: !prev[resource]?.[permission],
      },
    }));
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Roles & Permissions
          </h1>
          <p className="text-gray-600 mt-2">
            Define access levels for your team members
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Create Role
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingRole ? "Edit Role" : "Create Role"}
              </DialogTitle>
              <DialogDescription>
                {editingRole
                  ? "Update role details and permissions"
                  : "Define a new role with specific permissions"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-6 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Role Name</Label>
                <Input
                  id="name"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  placeholder="Manager, Team Lead, Viewer..."
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={roleDescription}
                  onChange={(e) => setRoleDescription(e.target.value)}
                  placeholder="What can this role do?"
                  rows={2}
                />
              </div>

              <div className="space-y-4">
                <Label>Permissions</Label>
                {RESOURCES.map((resource) => (
                  <Card key={resource.key}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">
                        {resource.label}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {PERMISSIONS.filter(perm => {
                          // Show invite only for users resource
                          if (perm.key === 'invite') return resource.key === 'users';
                          // Hide viewAll/viewDepartment/viewTeam for users
                          if (resource.key === 'users' && ['viewAll', 'viewDepartment', 'viewTeam'].includes(perm.key)) {
                            return false;
                          }
                          return true;
                        }).map((perm) => (
                          <div key={perm.key} className="flex items-center space-x-2">
                            <Checkbox
                              id={`${resource.key}-${perm.key}`}
                              checked={permissions[resource.key]?.[perm.key] || false}
                              onCheckedChange={() => togglePermission(resource.key, perm.key)}
                            />
                            <label
                              htmlFor={`${resource.key}-${perm.key}`}
                              className="text-sm cursor-pointer"
                            >
                              {perm.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Button type="submit" className="w-full">
                {editingRole ? "Update Role" : "Create Role"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-4 bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {roles.map((role) => (
          <Card key={role.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  {role.name}
                  {role.isSystemRole && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Lock className="h-3 w-3" />
                      System
                    </Badge>
                  )}
                </span>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {role._count?.users || 0}
                </Badge>
              </CardTitle>
              <CardDescription>
                {role.description || "No description"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 text-sm space-y-1">
                {Object.entries(role.permissions || {}).map(([resource, perms]: [string, any]) => {
                  const enabledPerms = Object.entries(perms).filter(([_, enabled]) => enabled);
                  if (enabledPerms.length === 0) return null;
                  return (
                    <div key={resource} className="flex gap-2 items-start">
                      <span className="font-medium capitalize min-w-[80px]">{resource}:</span>
                      <div className="flex flex-wrap gap-1">
                        {enabledPerms.map(([perm]) => (
                          <Badge key={perm} variant="outline" className="text-xs">
                            {perm}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openEditDialog(role)}
                  disabled={role.isSystemRole}
                  className="flex-1"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(role.id)}
                  disabled={role.isSystemRole}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {roles.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="text-center py-12">
              <Shield className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">No roles yet</p>
              <p className="text-sm text-gray-500 mt-1">
                Create your first role to define team permissions
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
