using Microsoft.AspNetCore.Mvc.ApplicationModels;

namespace Api.Extensions;

[AttributeUsage(AttributeTargets.Class)]
public sealed class NetworkModuleAttribute : Attribute;

public sealed class NetworkModuleControllerConvention : IApplicationModelConvention
{
    private readonly bool _networkEnabled;

    public NetworkModuleControllerConvention(bool networkEnabled)
    {
        _networkEnabled = networkEnabled;
    }

    public void Apply(ApplicationModel application)
    {
        if (_networkEnabled)
        {
            return;
        }

        foreach (var controller in application.Controllers.ToArray())
        {
            if (controller.Attributes.OfType<NetworkModuleAttribute>().Any())
            {
                application.Controllers.Remove(controller);
            }
        }
    }
}
